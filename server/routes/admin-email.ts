import express from 'express';
import { emailService, EmailService } from '../services/emailService.js';

const router = express.Router();

// Admin middleware (simple auth check for development)
const adminAuth = (req: any, res: any, next: any) => {
  // In development, allow admin access with basic auth
  const auth = req.headers.authorization;
  
  if (!auth) {
    return res.status(401).json({
      success: false,
      message: "Admin authentication required"
    });
  }

  // Basic auth check - in production, use proper admin session
  const credentials = Buffer.from(auth.split(' ')[1] || '', 'base64').toString().split(':');
  const username = credentials[0];
  const password = credentials[1];

  // Default admin credentials for development
  if (username === 'admin' && password === 'admin123') {
    next();
  } else {
    res.status(401).json({
      success: false,
      message: "Invalid admin credentials"
    });
  }
};

// =============================================================================
// EMAIL CONFIGURATION ENDPOINTS
// =============================================================================

// Get current email configuration
router.get('/config', adminAuth, async (req, res) => {
  try {
    const config = emailService.getConfiguration();
    
    res.json({
      success: true,
      data: {
        config,
        developmentSettings: EmailService.getDevSettings()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get email configuration"
    });
  }
});

// Update email configuration
router.post('/config', adminAuth, async (req, res) => {
  try {
    const { smtpHost, smtpPort, smtpUser, smtpPassword, fromEmail, fromName, secure } = req.body;
    
    // Validate required fields
    if (!smtpHost || !smtpPort || !fromEmail) {
      return res.status(400).json({
        success: false,
        message: "SMTP host, port, and from email are required"
      });
    }

    const newConfig = {
      smtpHost,
      smtpPort: parseInt(smtpPort),
      smtpUser: smtpUser || '',
      smtpPassword: smtpPassword || '',
      fromEmail,
      fromName: fromName || 'DesiBazaar Platform',
      secure: secure === true || smtpPort === 465
    };

    const success = await emailService.updateConfiguration(newConfig);
    
    if (success) {
      res.json({
        success: true,
        message: "Email configuration updated successfully",
        data: emailService.getConfiguration()
      });
    } else {
      res.status(500).json({
        success: false,
        message: "Failed to update email configuration"
      });
    }
  } catch (error) {
    console.error('Email config update error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to update email configuration"
    });
  }
});

// Test email configuration
router.post('/test', adminAuth, async (req, res) => {
  try {
    const { testEmail } = req.body;
    
    if (!testEmail) {
      return res.status(400).json({
        success: false,
        message: "Test email address is required"
      });
    }

    // Send test email
    const result = await emailService.sendOtpEmail(
      testEmail, 
      '12345678', 
      'Test Configuration'
    );

    res.json({
      success: result.success,
      message: result.success 
        ? "Test email sent successfully" 
        : "Failed to send test email",
      data: {
        messageId: result.messageId,
        mode: result.mode,
        error: result.error
      }
    });
  } catch (error) {
    console.error('Email test error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to send test email"
    });
  }
});

// =============================================================================
// DEVELOPMENT TOGGLE ENDPOINTS
// =============================================================================

// Get development settings
router.get('/dev/settings', adminAuth, async (req, res) => {
  try {
    const settings = EmailService.getDevSettings();
    
    res.json({
      success: true,
      data: {
        settings,
        environment: process.env.NODE_ENV || 'development',
        availableToggles: [
          'enableOtpVerification',
          'skipEmailSending',
          'mockOtp'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get development settings"
    });
  }
});

// Toggle OTP verification
router.post('/dev/toggle-otp', adminAuth, async (req, res) => {
  try {
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "enabled field must be a boolean"
      });
    }

    EmailService.toggleOtpVerification(enabled);
    
    res.json({
      success: true,
      message: `OTP verification ${enabled ? 'enabled' : 'disabled'}`,
      data: {
        otpVerificationEnabled: enabled,
        settings: EmailService.getDevSettings()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle OTP verification"
    });
  }
});

// Set mock OTP for development
router.post('/dev/mock-otp', adminAuth, async (req, res) => {
  try {
    const { otp } = req.body;
    
    if (!otp || !/^\d{8}$/.test(otp)) {
      return res.status(400).json({
        success: false,
        message: "OTP must be exactly 8 digits"
      });
    }

    EmailService.setMockOtp(otp);
    
    res.json({
      success: true,
      message: `Mock OTP set to: ${otp}`,
      data: {
        mockOtp: otp,
        settings: EmailService.getDevSettings()
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to set mock OTP"
    });
  }
});

// Reset to development defaults
router.post('/dev/reset', adminAuth, async (req, res) => {
  try {
    // Reset to development defaults
    EmailService.toggleOtpVerification(false); // Disable OTP in development
    EmailService.setMockOtp('12345678');
    
    res.json({
      success: true,
      message: "Development settings reset to defaults",
      data: {
        settings: EmailService.getDevSettings(),
        changes: [
          'OTP verification disabled',
          'Mock OTP set to 12345678',
          'Email sending kept as configured'
        ]
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset development settings"
    });
  }
});

// =============================================================================
// EMAIL TEMPLATES PREVIEW
// =============================================================================

// Preview email templates
router.get('/templates/preview/:type', adminAuth, async (req, res) => {
  try {
    const { type } = req.params;
    const { email, businessName, otp } = req.query;
    
    let html = '';
    let subject = '';
    
    switch (type) {
      case 'otp':
        subject = `Verify your ${businessName || 'DesiBazaar'} account`;
        // Use reflection to access private method for preview
        const emailServiceInstance = emailService as any;
        html = emailServiceInstance.generateOtpEmailTemplate(
          otp as string || '12345678', 
          businessName as string
        );
        break;
        
      case 'welcome':
        subject = `Welcome to DesiBazaar - ${businessName || 'Your Business'}`;
        html = (emailService as any).generateWelcomeEmailTemplate(
          businessName as string || 'Your Business',
          'restaurant'
        );
        break;
        
      case 'password-reset':
        subject = 'Reset your DesiBazaar password';
        html = (emailService as any).generatePasswordResetTemplate(
          'sample-reset-token-123'
        );
        break;
        
      default:
        return res.status(400).json({
          success: false,
          message: "Invalid template type. Use: otp, welcome, password-reset"
        });
    }
    
    res.json({
      success: true,
      data: {
        type,
        subject,
        html,
        previewNote: "This is a preview - no email will be sent"
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to generate template preview"
    });
  }
});

export default router;