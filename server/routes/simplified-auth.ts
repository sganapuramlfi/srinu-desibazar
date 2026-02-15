import express from 'express';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { db } from '../../db/index.js';
import { platformUsers, businessTenants, businessAccess, businessSubscriptions } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';

const router = express.Router();

// Store OTPs temporarily (in production, use Redis)
const otpStore = new Map<string, { otp: string; expires: number; userId?: number }>();

// Generate 8-digit OTP
function generateOTP(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString();
}

import { emailService, EmailService } from '../services/emailService.js';

// =============================================================================
// SIMPLIFIED REGISTRATION FLOW
// =============================================================================

// Step 1: Smart location detection (GET)
router.get('/location/detect', async (req, res) => {
  try {
    // In production, use IP geolocation service
    const mockLocation = {
      city: "Melbourne",
      state: "VIC", 
      country: "Australia",
      latitude: -37.8136,
      longitude: 144.9631,
      nearbyBusinesses: 2 // Count from our DB
    };
    
    res.json({
      success: true,
      location: mockLocation,
      message: "Location detected successfully"
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to detect location"
    });
  }
});

// Step 2: Register business with password (POST)
router.post('/register/business', async (req, res) => {
  try {
    const { businessName, email, password, industryType } = req.body;
    
    // Validate required fields
    if (!businessName || !email || !password || !industryType) {
      return res.status(400).json({
        success: false,
        message: "Business name, email, password, and industry type are required"
      });
    }
    
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format"
      });
    }
    
    // Validate password strength
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters"
      });
    }
    
    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, email))
      .limit(1);
    
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered"
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user account
    const [newUser] = await db
      .insert(platformUsers)
      .values({
        email,
        passwordHash,
        fullName: businessName + " Owner", // Default name
        isEmailVerified: false // Must verify email
      })
      .returning();
    
    // Generate business slug
    const slug = businessName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .substring(0, 50);
    
    // Create business tenant
    const [newBusiness] = await db
      .insert(businessTenants)
      .values({
        name: businessName,
        slug: slug + '-' + Date.now(), // Ensure uniqueness
        industryType,
        status: 'pending', // Pending email verification
        description: `${businessName} - ${industryType} business`,
        onboardingCompleted: false
      })
      .returning();
    
    // Create business access (owner role)
    await db
      .insert(businessAccess)
      .values({
        businessId: newBusiness.id,
        userId: newUser.id,
        role: 'owner',
        permissions: JSON.stringify(['full_access']),
        grantedBy: newUser.id
      });

    // Create default subscription (180-day premium trial)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 180); // 180 days from now

    await db
      .insert(businessSubscriptions)
      .values({
        businessId: newBusiness.id,
        planId: 2, // Premium plan (ID 2) - 180 day trial
        status: 'trial',
        billingEmail: email,
        billingCycle: 'monthly',
        currentUsage: JSON.stringify({
          enabledModules: [industryType],
          adCount: 0,
          maxAdsPerMonth: 25
        }),
        trialEndsAt: trialEndDate,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndDate
      });
    
    // Check if we're in development mode and should auto-verify
    const isDevMode = process.env.NODE_ENV === 'development';
    const otpDisabled = process.env.ENABLE_OTP_VERIFICATION === 'false';
    const noSmtp = !process.env.SMTP_USER;
    
    console.log(`🔍 [Debug] NODE_ENV: ${process.env.NODE_ENV}, ENABLE_OTP_VERIFICATION: ${process.env.ENABLE_OTP_VERIFICATION}, SMTP_USER: ${process.env.SMTP_USER ? 'set' : 'not set'}`);
    console.log(`🔍 [Debug] isDevMode: ${isDevMode}, otpDisabled: ${otpDisabled}, noSmtp: ${noSmtp}`);
    
    if (isDevMode && (otpDisabled || noSmtp)) {
      console.log(`🔧 [Dev Mode] Auto-verifying business registration for ${email}`);
      
      // Auto-verify email in development
      await db
        .update(platformUsers)
        .set({ isEmailVerified: true })
        .where(eq(platformUsers.id, newUser.id));
      
      // Activate business
      await db
        .update(businessTenants)
        .set({ status: 'active' })
        .where(eq(businessTenants.id, newBusiness.id));
      
      // Auto-login user
      req.login(newUser, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Registration successful but auto-login failed"
          });
        }
        
        res.json({
          success: true,
          message: "Development mode: Registration and verification completed!",
          data: {
            userId: newUser.id,
            businessId: newBusiness.id,
            email: newUser.email,
            businessName: newBusiness.name,
            industryType: newBusiness.industryType,
            emailVerificationRequired: false,
            devMode: true,
            redirectTo: `/dashboard/${newBusiness.slug}`
          }
        });
      });
      
      return; // Exit early for dev mode
    }
    
    // Production mode: require email verification
    const otp = generateOTP();
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    otpStore.set(email, { otp, expires, userId: newUser.id });
    
    // Send verification email using the email service
    const emailResult = await emailService.sendOtpEmail(
      email,
      otp,
      businessName
    );
    
    res.json({
      success: true,
      message: "Registration successful! Please check your email for verification code.",
      data: {
        userId: newUser.id,
        businessId: newBusiness.id,
        email: newUser.email,
        businessName: newBusiness.name,
        industryType: newBusiness.industryType,
        emailVerificationRequired: true
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again."
    });
  }
});

// Step 3: Verify email with OTP (POST)
router.post('/verify/email', async (req, res) => {
  try {
    const { email, otp } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    // Check if OTP verification is disabled in development
    const devSettings = EmailService.getDevSettings();
    if (!devSettings.enableOtpVerification) {
      console.log(`🔧 [Dev Mode] OTP verification disabled - auto-verifying ${email}`);
      
      // Find user by email for auto-verification
      const [user] = await db
        .select()
        .from(platformUsers)
        .where(eq(platformUsers.email, email))
        .limit(1);
      
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found"
        });
      }
      
      // Auto-verify in development mode
      await db
        .update(platformUsers)
        .set({ isEmailVerified: true })
        .where(eq(platformUsers.id, user.id));
      
      // Activate business
      const [business] = await db
        .select()
        .from(businessTenants)
        .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
        .where(eq(businessAccess.userId, user.id))
        .limit(1);
      
      if (business) {
        await db
          .update(businessTenants)
          .set({ status: 'active' })
          .where(eq(businessTenants.id, business.business_tenants.id));
      }
      
      // Auto-login user
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            message: "Auto-verification successful but login failed"
          });
        }
        
        res.json({
          success: true,
          message: "Development mode: Email auto-verified successfully!",
          data: {
            user: {
              id: user.id,
              email: user.email,
              fullName: user.fullName,
              isEmailVerified: true
            },
            business: business?.business_tenants,
            redirectTo: `/dashboard/${business?.business_tenants.industryType || 'general'}`,
            devMode: true
          }
        });
      });
      
      return; // Exit early for dev mode
    }
    
    // Normal OTP verification for production
    if (!otp) {
      return res.status(400).json({
        success: false,
        message: "OTP is required"
      });
    }
    
    // Check OTP
    const stored = otpStore.get(email);
    if (!stored) {
      return res.status(400).json({
        success: false,
        message: "OTP not found or expired"
      });
    }
    
    if (stored.expires < Date.now()) {
      otpStore.delete(email);
      return res.status(400).json({
        success: false,
        message: "OTP expired. Please request a new one."
      });
    }
    
    if (stored.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }
    
    // Mark email as verified
    await db
      .update(platformUsers)
      .set({ isEmailVerified: true })
      .where(eq(platformUsers.id, stored.userId!));
    
    // Activate business
    const [business] = await db
      .select()
      .from(businessTenants)
      .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
      .where(eq(businessAccess.userId, stored.userId!))
      .limit(1);
    
    if (business) {
      await db
        .update(businessTenants)
        .set({ status: 'active' })
        .where(eq(businessTenants.id, business.business_tenants.id));
    }
    
    // Clean up OTP
    otpStore.delete(email);
    
    // Auto-login user
    const [verifiedUser] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.id, stored.userId!))
      .limit(1);
    
    // Set session
    req.login(verifiedUser, (err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          message: "Verification successful but login failed"
        });
      }
      
      res.json({
        success: true,
        message: "Email verified successfully!",
        data: {
          user: {
            id: verifiedUser.id,
            email: verifiedUser.email,
            fullName: verifiedUser.fullName,
            isEmailVerified: true
          },
          business: business?.business_tenants,
          redirectTo: `/dashboard/${business?.business_tenants.industryType || 'general'}`
        }
      });
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: "Verification failed. Please try again."
    });
  }
});

// Resend OTP (POST)
router.post('/verify/resend', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }
    
    // Check if user exists and is unverified
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(and(
        eq(platformUsers.email, email),
        eq(platformUsers.isEmailVerified, false)
      ))
      .limit(1);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found or already verified"
      });
    }
    
    // Generate new OTP
    const otp = generateOTP();
    const expires = Date.now() + (10 * 60 * 1000); // 10 minutes
    
    otpStore.set(email, { otp, expires, userId: user.id });
    
    // Send email
    await emailService.sendOtpEmail(email, otp);
    
    res.json({
      success: true,
      message: "New verification code sent to your email"
    });
    
  } catch (error) {
    console.error('Resend OTP error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to resend verification code"
    });
  }
});

// Customer registration (POST)
router.post('/register/customer', async (req, res) => {
  try {
    const { email, password, fullName, username } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email and password are required"
      });
    }
    
    // Validate email format
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid email format"
      });
    }
    
    // Validate password strength
    if (password.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "Password must be at least 6 characters"
      });
    }
    
    // Check if email already exists
    const [existingUser] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, email))
      .limit(1);
    
    if (existingUser) {
      return res.status(400).json({
        ok: false,
        message: "Email already registered"
      });
    }
    
    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);
    
    // Create user account
    const [newUser] = await db
      .insert(platformUsers)
      .values({
        email,
        passwordHash,
        fullName: fullName || username || email.split('@')[0],
        isEmailVerified: true // Auto-verify customers for simpler flow
      })
      .returning();
    
    // Auto-login user
    req.login(newUser, (err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Registration successful but login failed"
        });
      }
      
      res.json({
        ok: true,
        message: "Customer registration successful",
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.fullName,
          isEmailVerified: newUser.isEmailVerified,
          businessAccess: [],
          primaryBusiness: null
        }
      });
    });
    
  } catch (error) {
    console.error('Customer registration error:', error);
    res.status(500).json({
      ok: false,
      message: "Registration failed. Please try again."
    });
  }
});

// =============================================================================
// SIMPLIFIED LOGIN FLOW
// =============================================================================

// Get current user info (GET)
router.get('/user', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Not authenticated"
      });
    }

    const user = req.user as any;
    
    // Get user's business access
    const userBusinessAccess = await db
      .select({
        businessId: businessTenants.id,
        businessName: businessTenants.name,
        businessSlug: businessTenants.slug,
        industryType: businessTenants.industryType,
        role: businessAccess.role,
        permissions: businessAccess.permissions,
        isActive: businessAccess.isActive
      })
      .from(businessTenants)
      .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
      .where(eq(businessAccess.userId, user.id));
    
    // Find primary business (first active business)
    const primaryBusiness = userBusinessAccess.find(ba => ba.isActive && ba.role === 'owner') || userBusinessAccess[0];

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      createdAt: user.createdAt,
      businessAccess: userBusinessAccess,
      primaryBusiness
    });
    
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      ok: false,
      message: "Failed to get user info"
    });
  }
});

// Logout (POST)
router.post('/logout', async (req, res) => {
  try {
    req.logout((err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Logout failed"
        });
      }
      
      res.json({
        ok: true,
        message: "Logged out successfully"
      });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      ok: false,
      message: "Logout failed"
    });
  }
});

// Debug endpoint to test database connection
router.get('/debug/users', async (req, res) => {
  try {
    const users = await db
      .select({ 
        id: platformUsers.id, 
        email: platformUsers.email,
        isEmailVerified: platformUsers.isEmailVerified,
        createdAt: platformUsers.createdAt
      })
      .from(platformUsers)
      .orderBy(platformUsers.id)
      .limit(20);
    
    res.json({ success: true, users, count: users.length });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to test password verification
router.post('/debug/password', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, email))
      .limit(1);
    
    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }
    
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    
    res.json({ 
      success: true, 
      user: { id: user.id, email: user.email }, 
      passwordValid,
      hashLength: user.passwordHash.length
    });
  } catch (error) {
    console.error('Debug password error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint to test business access query
router.post('/debug/business-access', async (req, res) => {
  try {
    const { userId } = req.body;
    
    const userBusinessAccess = await db
      .select({
        businessId: businessTenants.id,
        businessName: businessTenants.name,
        businessSlug: businessTenants.slug,
        industryType: businessTenants.industryType,
        role: businessAccess.role,
        permissions: businessAccess.permissions,
        isActive: businessAccess.isActive
      })
      .from(businessTenants)
      .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
      .where(eq(businessAccess.userId, userId));
    
    const primaryBusiness = userBusinessAccess.find(ba => ba.isActive && ba.role === 'owner') || userBusinessAccess[0];
    
    res.json({ 
      success: true, 
      businessAccess: userBusinessAccess,
      primaryBusiness,
      count: userBusinessAccess.length
    });
  } catch (error) {
    console.error('Debug business access error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login with email + password (POST)
router.post('/login', async (req, res) => {
  try {
    const { email, password, username } = req.body;
    
    // Support both email and username fields for compatibility
    const loginEmail = email || username;
    
    if (!loginEmail || !password) {
      return res.status(400).json({
        ok: false,
        message: "Email and password are required"
      });
    }
    
    // Find user
    console.log(`🔍 [Login Debug] Looking for user with email: ${loginEmail}`);
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.email, loginEmail))
      .limit(1);
    
    if (!user) {
      console.log(`🔍 [Login Debug] User not found for email: ${loginEmail}`);
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password"
      });
    }
    
    console.log(`🔍 [Login Debug] User found: ${user.id}, email verified: ${user.isEmailVerified}`);
    
    // Verify password
    const passwordValid = await bcrypt.compare(password, user.passwordHash);
    if (!passwordValid) {
      console.log(`🔍 [Login Debug] Password verification failed for user: ${user.id}`);
      return res.status(401).json({
        ok: false,
        message: "Invalid email or password"
      });
    }
    
    console.log(`🔍 [Login Debug] Password verified successfully for user: ${user.id}`);
    
    // Get user's business access
    const userBusinessAccess = await db
      .select({
        businessId: businessTenants.id,
        businessName: businessTenants.name,
        businessSlug: businessTenants.slug,
        industryType: businessTenants.industryType,
        role: businessAccess.role,
        permissions: businessAccess.permissions,
        isActive: businessAccess.isActive
      })
      .from(businessTenants)
      .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
      .where(eq(businessAccess.userId, user.id));
    
    // Find primary business (first active business)
    const primaryBusiness = userBusinessAccess.find(ba => ba.isActive && ba.role === 'owner') || userBusinessAccess[0];
    
    // Login successful
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({
          ok: false,
          message: "Login failed"
        });
      }
      
      res.json({
        ok: true,
        message: "Login successful",
        user: {
          id: user.id,
          email: user.email,
          fullName: user.fullName,
          phone: user.phone,
          isEmailVerified: user.isEmailVerified,
          isPhoneVerified: user.isPhoneVerified,
          createdAt: user.createdAt,
          businessAccess: userBusinessAccess,
          primaryBusiness
        }
      });
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      ok: false,
      message: "Login failed. Please try again."
    });
  }
});

// =============================================================================
// SIMPLE BUSINESS LISTING
// =============================================================================

// Get all active businesses with basic info (PUBLIC)
router.get('/businesses', async (req, res) => {
  try {
    const { location, industry, search } = req.query;
    
    let query = db
      .select({
        id: businessTenants.id,
        name: businessTenants.name,
        slug: businessTenants.slug,
        industryType: businessTenants.industryType,
        description: businessTenants.description,
        logoUrl: businessTenants.logoUrl,
        contactInfo: businessTenants.contactInfo,
        operatingHours: businessTenants.operatingHours,
        amenities: businessTenants.amenities,
        city: businessTenants.city,
        state: businessTenants.state,
        latitude: businessTenants.latitude,
        longitude: businessTenants.longitude,
        isVerified: businessTenants.isVerified,
        createdAt: businessTenants.createdAt
      })
      .from(businessTenants)
      .where(eq(businessTenants.status, 'active'));
    
    // Add filters if provided
    if (industry) {
      query = query.where(and(
        eq(businessTenants.status, 'active'),
        eq(businessTenants.industryType, industry as string)
      ));
    }
    
    const businesses = await query.limit(50); // Limit for performance
    
    // Add basic stats
    const stats = {
      total: businesses.length,
      byIndustry: businesses.reduce((acc, business) => {
        acc[business.industryType] = (acc[business.industryType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
    
    res.json({
      success: true,
      data: {
        businesses,
        stats,
        filters: {
          location: location || 'all',
          industry: industry || 'all',
          search: search || ''
        }
      }
    });
    
  } catch (error) {
    console.error('Business listing error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to load businesses"
    });
  }
});

// Get business by slug (PUBLIC)
router.get('/business/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(and(
        eq(businessTenants.slug, slug),
        eq(businessTenants.status, 'active')
      ))
      .limit(1);
    
    if (!business) {
      return res.status(404).json({
        success: false,
        message: "Business not found"
      });
    }
    
    res.json({
      success: true,
      data: { business }
    });
    
  } catch (error) {
    console.error('Business detail error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to load business details"
    });
  }
});

// =============================================================================
// INDUSTRY-SPECIFIC ONBOARDING STATUS
// =============================================================================

// Get user's business and onboarding status (AUTHENTICATED)
router.get('/dashboard/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required"
      });
    }
    
    // Get user's business
    const businessData = await db
      .select({
        business: businessTenants,
        access: businessAccess
      })
      .from(businessTenants)
      .innerJoin(businessAccess, eq(businessAccess.businessId, businessTenants.id))
      .where(eq(businessAccess.userId, (req.user as any).id))
      .limit(1);
    
    if (!businessData.length) {
      return res.json({
        success: true,
        data: {
          hasBusinessSetup: false,
          redirectTo: '/setup'
        }
      });
    }
    
    const { business, access } = businessData[0];
    
    // Determine onboarding steps based on industry
    const onboardingSteps = {
      salon: [
        { id: 'services', name: 'Add Services', completed: false, path: '/setup/services' },
        { id: 'staff', name: 'Add Staff', completed: false, path: '/setup/staff' },
        { id: 'schedule', name: 'Set Schedule', completed: false, path: '/setup/schedule' },
        { id: 'storefront', name: 'Setup Storefront', completed: false, path: '/setup/storefront' }
      ],
      restaurant: [
        { id: 'menu', name: 'Create Menu', completed: false, path: '/setup/menu' },
        { id: 'tables', name: 'Add Tables', completed: false, path: '/setup/tables' },
        { id: 'hours', name: 'Set Hours', completed: false, path: '/setup/hours' },
        { id: 'storefront', name: 'Setup Storefront', completed: false, path: '/setup/storefront' }
      ]
    };
    
    const industrySteps = onboardingSteps[business.industryType as keyof typeof onboardingSteps] || [];
    
    res.json({
      success: true,
      data: {
        hasBusinessSetup: true,
        user: req.user,
        business,
        access,
        onboarding: {
          completed: business.onboardingCompleted,
          steps: industrySteps,
          nextStep: industrySteps.find(step => !step.completed)
        },
        redirectTo: business.onboardingCompleted 
          ? `/dashboard/${business.industryType}`
          : `/onboarding/${business.industryType}`
      }
    });
    
  } catch (error) {
    console.error('Dashboard status error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard status"
    });
  }
});

// =============================================================================
// PROFILE MANAGEMENT
// =============================================================================

// Update user profile (PUT)
router.put('/profile', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required"
      });
    }

    const { fullName, phone, preferences, notifications } = req.body;
    const userId = (req.user as any).id;

    // Validate input
    if (fullName && typeof fullName !== 'string') {
      return res.status(400).json({
        ok: false,
        message: "Full name must be a string"
      });
    }

    if (phone && !/^\+?[\d\s\-\(\)]+$/.test(phone)) {
      return res.status(400).json({
        ok: false,
        message: "Invalid phone number format"
      });
    }

    // Update user profile
    const updateData: any = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (preferences !== undefined) updateData.preferences = preferences; // JSONB handles objects directly
    if (notifications !== undefined) updateData.notificationSettings = notifications; // JSONB handles objects directly

    const [updatedUser] = await db
      .update(platformUsers)
      .set(updateData)
      .where(eq(platformUsers.id, userId))
      .returning();

    if (!updatedUser) {
      return res.status(404).json({
        ok: false,
        message: "User not found"
      });
    }

    res.json({
      ok: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phone: updatedUser.phone,
        preferences: updatedUser.preferences || null,
        notificationSettings: updatedUser.notificationSettings || null,
        isEmailVerified: updatedUser.isEmailVerified,
        isPhoneVerified: updatedUser.isPhoneVerified
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      ok: false,
      message: "Failed to update profile"
    });
  }
});

// Change password (PUT)
router.put('/profile/password', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required"
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = (req.user as any).id;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        ok: false,
        message: "Current password and new password are required"
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        ok: false,
        message: "New password must be at least 6 characters"
      });
    }

    // Get current user with password
    const [user] = await db
      .select()
      .from(platformUsers)
      .where(eq(platformUsers.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found"
      });
    }

    // Verify current password
    const passwordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!passwordValid) {
      return res.status(400).json({
        ok: false,
        message: "Current password is incorrect"
      });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12);

    // Update password
    await db
      .update(platformUsers)
      .set({ passwordHash: newPasswordHash })
      .where(eq(platformUsers.id, userId));

    res.json({
      ok: true,
      message: "Password updated successfully"
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      ok: false,
      message: "Failed to update password"
    });
  }
});

// Get user preferences (GET)
router.get('/profile/preferences', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        ok: false,
        message: "Authentication required"
      });
    }

    const userId = (req.user as any).id;

    const [user] = await db
      .select({
        preferences: platformUsers.preferences,
        notificationSettings: platformUsers.notificationSettings
      })
      .from(platformUsers)
      .where(eq(platformUsers.id, userId))
      .limit(1);

    if (!user) {
      return res.status(404).json({
        ok: false,
        message: "User not found"
      });
    }

    // JSONB fields come as objects, not strings
    const preferences = user.preferences && typeof user.preferences === 'object' 
      ? user.preferences 
      : {
          favoriteCategories: [],
          preferredLocations: [],
          bookingReminders: true,
          marketingEmails: false,
          smsNotifications: true
        };

    const notificationSettings = user.notificationSettings && typeof user.notificationSettings === 'object' 
      ? user.notificationSettings 
      : {
          bookingConfirmations: true,
          bookingReminders: true,
          promotionalEmails: false,
          smsNotifications: true,
          pushNotifications: true
        };

    res.json({
      ok: true,
      preferences,
      notificationSettings
    });

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      ok: false,
      message: "Failed to get preferences"
    });
  }
});

export default router;