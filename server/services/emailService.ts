import nodemailer from 'nodemailer';
import { db } from '../../db/index.js';
import { businessSettings } from '../../db/index.js';
import { eq } from 'drizzle-orm';

// Email configuration interface
interface EmailConfig {
  smtpHost: string;
  smtpPort: number;
  smtpUser: string;
  smtpPassword: string;
  fromEmail: string;
  fromName: string;
  secure: boolean; // true for 465, false for other ports
}

// Default email configuration (fallback)
const DEFAULT_CONFIG: EmailConfig = {
  smtpHost: process.env.SMTP_HOST || 'smtp.gmail.com',
  smtpPort: parseInt(process.env.SMTP_PORT || '587'),
  smtpUser: process.env.SMTP_USER || '',
  smtpPassword: process.env.SMTP_PASSWORD || '',
  fromEmail: process.env.FROM_EMAIL || 'noreply@desibazaar.com',
  fromName: process.env.FROM_NAME || 'DesiBazaar Platform',
  secure: false
};

// Development settings
const DEV_SETTINGS = {
  enableOtpVerification: process.env.ENABLE_OTP_VERIFICATION !== 'false', // true by default
  skipEmailSending: process.env.NODE_ENV === 'development' && process.env.SKIP_EMAIL_SENDING === 'true',
  mockOtp: process.env.MOCK_OTP || '12345678' // Default OTP for development
};

export class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private config: EmailConfig = DEFAULT_CONFIG;

  constructor() {
    this.initializeTransporter();
  }

  // Initialize SMTP transporter
  private async initializeTransporter() {
    try {
      // Try to load configuration from database
      await this.loadConfigFromDatabase();
      
      // Create transporter
      this.transporter = nodemailer.createTransport({
        host: this.config.smtpHost,
        port: this.config.smtpPort,
        secure: this.config.secure,
        auth: this.config.smtpUser && this.config.smtpPassword ? {
          user: this.config.smtpUser,
          pass: this.config.smtpPassword
        } : undefined,
        tls: {
          rejectUnauthorized: false // For development
        }
      });

      // Verify connection
      if (this.config.smtpUser && this.config.smtpPassword) {
        await this.transporter.verify();
        console.log('📧 [EmailService] SMTP connection verified successfully');
      } else {
        console.log('📧 [EmailService] SMTP credentials not configured, using mock mode');
      }
    } catch (error) {
      console.error('📧 [EmailService] SMTP configuration failed:', error);
      console.log('📧 [EmailService] Falling back to mock email mode');
      this.transporter = null;
    }
  }

  // Load email configuration from database
  private async loadConfigFromDatabase() {
    try {
      const [settings] = await db
        .select()
        .from(businessSettings)
        .where(eq(businessSettings.settingKey, 'email_config'))
        .limit(1);

      if (settings && settings.settingValue) {
        const dbConfig = JSON.parse(settings.settingValue as string);
        this.config = { ...DEFAULT_CONFIG, ...dbConfig };
        console.log('📧 [EmailService] Loaded configuration from database');
      }
    } catch (error) {
      console.log('📧 [EmailService] Using default email configuration');
    }
  }

  // Update email configuration
  async updateConfiguration(newConfig: Partial<EmailConfig>) {
    try {
      this.config = { ...this.config, ...newConfig };
      
      // Save to database
      await db
        .insert(businessSettings)
        .values({
          businessId: null, // Platform-wide setting
          settingKey: 'email_config',
          settingValue: JSON.stringify(this.config),
          settingType: 'platform',
          isActive: true
        })
        .onConflictDoUpdate({
          target: businessSettings.settingKey,
          set: {
            settingValue: JSON.stringify(this.config),
            updatedAt: new Date()
          }
        });

      // Reinitialize transporter
      await this.initializeTransporter();
      
      console.log('📧 [EmailService] Configuration updated successfully');
      return true;
    } catch (error) {
      console.error('📧 [EmailService] Failed to update configuration:', error);
      return false;
    }
  }

  // Get current configuration (without sensitive data)
  getConfiguration() {
    return {
      smtpHost: this.config.smtpHost,
      smtpPort: this.config.smtpPort,
      fromEmail: this.config.fromEmail,
      fromName: this.config.fromName,
      secure: this.config.secure,
      hasCredentials: !!(this.config.smtpUser && this.config.smtpPassword),
      isConnected: !!this.transporter
    };
  }

  // Send OTP verification email
  async sendOtpEmail(to: string, otp: string, businessName?: string) {
    const subject = `Verify your ${businessName || 'DesiBazaar'} account`;
    const html = this.generateOtpEmailTemplate(otp, businessName);
    
    return this.sendEmail(to, subject, html, 'otp_verification');
  }

  // Send welcome email
  async sendWelcomeEmail(to: string, businessName: string, industryType: string) {
    const subject = `Welcome to DesiBazaar - ${businessName}`;
    const html = this.generateWelcomeEmailTemplate(businessName, industryType);
    
    return this.sendEmail(to, subject, html, 'welcome');
  }

  // Send password reset email
  async sendPasswordResetEmail(to: string, resetToken: string) {
    const subject = 'Reset your DesiBazaar password';
    const html = this.generatePasswordResetTemplate(resetToken);

    return this.sendEmail(to, subject, html, 'password_reset');
  }

  // Send trial expiry warning email
  async sendTrialExpiryWarning(to: string, businessName: string, daysRemaining: number) {
    const subject = `Your DesiBazaar trial ends in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Trial Expiring Soon</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#F59E0B;color:white;padding:20px;text-align:center;">
          <h1>⚠️ Trial Ending Soon</h1>
          <p>${businessName}</p>
        </div>
        <div style="padding:30px;background:#f9f9f9;">
          <h2>Your trial expires in ${daysRemaining} ${daysRemaining === 1 ? 'day' : 'days'}</h2>
          <p>To keep using all DesiBazaar features, please upgrade to a paid plan before your trial ends.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/billing"
             style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
             Upgrade Now
          </a></p>
        </div>
      </div>
    </body>
    </html>`;
    return this.sendEmail(to, subject, html, 'trial_expiry_warning');
  }

  // Send trial expired email
  async sendTrialExpired(to: string, businessName: string) {
    const subject = `Your DesiBazaar trial has ended — ${businessName}`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Trial Expired</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#EF4444;color:white;padding:20px;text-align:center;">
          <h1>Trial Expired</h1>
          <p>${businessName}</p>
        </div>
        <div style="padding:30px;background:#f9f9f9;">
          <h2>Your free trial has ended</h2>
          <p>Your account has been downgraded to the free tier. Upgrade to restore full access.</p>
          <p><a href="${process.env.APP_URL || 'http://localhost:5173'}/billing"
             style="display:inline-block;background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
             View Plans
          </a></p>
        </div>
      </div>
    </body>
    </html>`;
    return this.sendEmail(to, subject, html, 'trial_expired');
  }

  // Send booking confirmation email
  async sendBookingConfirmation(to: string, options: {
    customerName: string;
    businessName: string;
    serviceName: string;
    scheduledAt: Date;
    bookingId: number;
  }) {
    const subject = `Booking confirmed — ${options.businessName}`;
    const dateStr = options.scheduledAt.toLocaleString('en-AU', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Booking Confirmed</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#10B981;color:white;padding:20px;text-align:center;">
          <h1>✅ Booking Confirmed!</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9;">
          <p>Hi ${options.customerName},</p>
          <p>Your booking has been confirmed:</p>
          <table style="width:100%;border-collapse:collapse;margin:20px 0;">
            <tr><td style="padding:8px;font-weight:bold;">Business</td><td style="padding:8px;">${options.businessName}</td></tr>
            <tr style="background:#eee;"><td style="padding:8px;font-weight:bold;">Service</td><td style="padding:8px;">${options.serviceName}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Date & Time</td><td style="padding:8px;">${dateStr}</td></tr>
            <tr style="background:#eee;"><td style="padding:8px;font-weight:bold;">Booking #</td><td style="padding:8px;">${options.bookingId}</td></tr>
          </table>
          <p>Need to make changes? Contact the business or visit your dashboard.</p>
        </div>
      </div>
    </body>
    </html>`;
    return this.sendEmail(to, subject, html, 'booking_confirmation');
  }

  // Send review request email (sent after appointment)
  async sendReviewRequest(to: string, options: {
    customerName: string;
    businessName: string;
    businessSlug: string;
  }) {
    const subject = `How was your visit to ${options.businessName}?`;
    const reviewUrl = `${process.env.APP_URL || 'http://localhost:5173'}/business/${options.businessSlug}#reviews`;
    const html = `
    <!DOCTYPE html>
    <html>
    <head><meta charset="utf-8"><title>Leave a Review</title></head>
    <body style="font-family:Arial,sans-serif;color:#333;">
      <div style="max-width:600px;margin:0 auto;padding:20px;">
        <div style="background:#4F46E5;color:white;padding:20px;text-align:center;">
          <h1>⭐ How Was Your Visit?</h1>
        </div>
        <div style="padding:30px;background:#f9f9f9;">
          <p>Hi ${options.customerName},</p>
          <p>We hope you enjoyed your visit to <strong>${options.businessName}</strong>! Share your experience to help others.</p>
          <p style="text-align:center;">
            <a href="${reviewUrl}"
               style="display:inline-block;background:#F59E0B;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;">
               Leave a Review
            </a>
          </p>
          <p style="font-size:12px;color:#666;">This email was sent because you recently had an appointment at ${options.businessName}.</p>
        </div>
      </div>
    </body>
    </html>`;
    return this.sendEmail(to, subject, html, 'review_request');
  }

  // Generic send email method
  private async sendEmail(to: string, subject: string, html: string, type: string) {
    try {
      // Check if OTP verification is disabled in development
      if (type === 'otp_verification' && !DEV_SETTINGS.enableOtpVerification) {
        console.log(`📧 [EmailService] OTP verification disabled - skipping email to ${to}`);
        return { success: true, messageId: 'otp-disabled', mode: 'otp-disabled' };
      }

      // Check if email sending is disabled in development
      if (DEV_SETTINGS.skipEmailSending) {
        console.log(`📧 [EmailService] Development mode - skipping email to ${to}`);
        console.log(`📧 [EmailService] Subject: ${subject}`);
        if (type === 'otp_verification') {
          const otpMatch = html.match(/\b\d{8}\b/);
          console.log(`📧 [EmailService] OTP: ${otpMatch ? otpMatch[0] : 'Not found'}`);
        }
        return { success: true, messageId: 'dev-mock', mode: 'development' };
      }

      // Send real email if transporter is available
      if (this.transporter) {
        const mailOptions = {
          from: `"${this.config.fromName}" <${this.config.fromEmail}>`,
          to,
          subject,
          html
        };

        const result = await this.transporter.sendMail(mailOptions);
        console.log(`📧 [EmailService] Email sent successfully to ${to} (${result.messageId})`);
        
        return { 
          success: true, 
          messageId: result.messageId, 
          mode: 'smtp',
          accepted: result.accepted,
          rejected: result.rejected 
        };
      } else {
        // Mock mode
        console.log(`📧 [EmailService] Mock mode - Email to: ${to}`);
        console.log(`📧 [EmailService] Subject: ${subject}`);
        if (type === 'otp_verification') {
          const otpMatch = html.match(/\b\d{8}\b/);
          console.log(`📧 [EmailService] OTP: ${otpMatch ? otpMatch[0] : 'Not found'}`);
        }
        
        return { success: true, messageId: 'mock-' + Date.now(), mode: 'mock' };
      }
    } catch (error) {
      console.error(`📧 [EmailService] Failed to send email to ${to}:`, error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        mode: 'error' 
      };
    }
  }

  // Email templates
  private generateOtpEmailTemplate(otp: string, businessName?: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Verify your account</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .otp-code { 
                font-size: 32px; 
                font-weight: bold; 
                color: #4F46E5; 
                text-align: center; 
                letter-spacing: 4px;
                background: white;
                padding: 20px;
                border-radius: 8px;
                margin: 20px 0;
            }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🏪 DesiBazaar</h1>
                <p>Verify your ${businessName || 'business'} account</p>
            </div>
            <div class="content">
                <h2>Email Verification Required</h2>
                <p>Thank you for registering with DesiBazaar! Please use the verification code below to complete your account setup:</p>
                
                <div class="otp-code">${otp}</div>
                
                <p><strong>Important:</strong></p>
                <ul>
                    <li>This code expires in 10 minutes</li>
                    <li>Enter this code in the verification form</li>
                    <li>Don't share this code with anyone</li>
                </ul>
                
                <p>If you didn't request this verification, please ignore this email.</p>
            </div>
            <div class="footer">
                <p>© 2024 DesiBazaar Platform. All rights reserved.</p>
                <p>This is an automated message, please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generateWelcomeEmailTemplate(businessName: string, industryType: string): string {
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Welcome to DesiBazaar</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .cta-button { 
                display: inline-block; 
                background: #4F46E5; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Welcome to DesiBazaar!</h1>
                <p>Your ${businessName} account is now active</p>
            </div>
            <div class="content">
                <h2>Congratulations! 🎊</h2>
                <p>Your ${industryType} business account has been successfully verified and activated.</p>
                
                <h3>Next Steps:</h3>
                <ul>
                    <li>Complete your business profile</li>
                    <li>Add your services/menu</li>
                    <li>Set up your storefront</li>
                    <li>Start accepting bookings</li>
                </ul>
                
                <p>Ready to get started?</p>
                <a href="https://desibazaar.com/dashboard" class="cta-button">Go to Dashboard</a>
                
                <p>Need help? Our support team is here to assist you every step of the way.</p>
            </div>
            <div class="footer">
                <p>© 2024 DesiBazaar Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  private generatePasswordResetTemplate(resetToken: string): string {
    const resetUrl = `https://desibazaar.com/reset-password?token=${resetToken}`;
    
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Reset your password</title>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 30px 20px; background: #f9f9f9; }
            .cta-button { 
                display: inline-block; 
                background: #EF4444; 
                color: white; 
                padding: 12px 24px; 
                text-decoration: none; 
                border-radius: 6px; 
                margin: 20px 0; 
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔒 Password Reset</h1>
                <p>Reset your DesiBazaar password</p>
            </div>
            <div class="content">
                <h2>Password Reset Requested</h2>
                <p>We received a request to reset your password. Click the button below to create a new password:</p>
                
                <a href="${resetUrl}" class="cta-button">Reset Password</a>
                
                <p><strong>Important:</strong></p>
                <ul>
                    <li>This link expires in 1 hour</li>
                    <li>If you didn't request this reset, ignore this email</li>
                    <li>Your password won't change until you create a new one</li>
                </ul>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            </div>
            <div class="footer">
                <p>© 2024 DesiBazaar Platform. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    `;
  }

  // Development methods
  static getDevSettings() {
    return DEV_SETTINGS;
  }

  static toggleOtpVerification(enabled: boolean) {
    process.env.ENABLE_OTP_VERIFICATION = enabled.toString();
    DEV_SETTINGS.enableOtpVerification = enabled;
    console.log(`📧 [EmailService] OTP verification ${enabled ? 'enabled' : 'disabled'}`);
  }

  static setMockOtp(otp: string) {
    process.env.MOCK_OTP = otp;
    DEV_SETTINGS.mockOtp = otp;
    console.log(`📧 [EmailService] Mock OTP set to: ${otp}`);
  }
}

// Singleton instance
export const emailService = new EmailService();