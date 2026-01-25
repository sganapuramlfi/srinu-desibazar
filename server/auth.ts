import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
// Import new business-centric schema
import { platformUsers, businessTenants, businessAccess } from "../db/index.js";
import { db } from "../db/index.js";
import { eq, and } from "drizzle-orm";
import express from "express";

const scryptAsync = promisify(scrypt);

// Enhanced password handling
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  },
  compare: async (suppliedPassword: string, storedPassword: string) => {
    const [hashedPassword, salt] = storedPassword.split(".");
    const hashedPasswordBuf = Buffer.from(hashedPassword, "hex");
    const suppliedPasswordBuf = (await scryptAsync(
      suppliedPassword,
      salt,
      64
    )) as Buffer;
    return timingSafeEqual(hashedPasswordBuf, suppliedPasswordBuf);
  },
};

interface BusinessAccessData {
  businessId: number;
  businessName: string;
  businessSlug: string;
  industryType: string;
  role: string;
  permissions: any;
  isActive: boolean;
}

interface SanitizedUser {
  id: number;
  email: string;
  fullName: string | null;
  phone: string | null;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: Date | null;
  businessAccess?: BusinessAccessData[];
  primaryBusiness?: BusinessAccessData;
}

declare global {
  namespace Express {
    interface User extends SanitizedUser {}
  }
}

async function getUserWithBusinessAccess(userId: number): Promise<SanitizedUser | null> {
  try {
    console.log(`[Auth] Fetching user data for ID: ${userId}`);

    const [user] = await db
      .select({
        id: platformUsers.id,
        email: platformUsers.email,
        fullName: platformUsers.fullName,
        phone: platformUsers.phone,
        isEmailVerified: platformUsers.isEmailVerified,
        isPhoneVerified: platformUsers.isPhoneVerified,
        createdAt: platformUsers.createdAt,
      })
      .from(platformUsers)
      .where(eq(platformUsers.id, userId))
      .limit(1);

    if (!user) {
      console.log(`[Auth] No user found for ID: ${userId}`);
      return null;
    }

    const sanitizedUser: SanitizedUser = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      isEmailVerified: user.isEmailVerified || false,
      isPhoneVerified: user.isPhoneVerified || false,
      createdAt: user.createdAt
    };

    // Fetch all business access for this user
    console.log(`[Auth] Fetching business access data for user ID: ${userId}`);
    const userBusinessAccess = await db
      .select({
        businessId: businessAccess.businessId,
        role: businessAccess.role,
        permissions: businessAccess.permissions,
        isActive: businessAccess.isActive,
        businessName: businessTenants.name,
        businessSlug: businessTenants.slug,
        industryType: businessTenants.industryType,
      })
      .from(businessAccess)
      .innerJoin(businessTenants, eq(businessTenants.id, businessAccess.businessId))
      .where(and(
        eq(businessAccess.userId, userId),
        eq(businessAccess.isActive, true)
      ));

    if (userBusinessAccess.length > 0) {
      sanitizedUser.businessAccess = userBusinessAccess.map(access => ({
        businessId: access.businessId,
        businessName: access.businessName,
        businessSlug: access.businessSlug,
        industryType: access.industryType,
        role: access.role,
        permissions: access.permissions,
        isActive: access.isActive,
      }));

      // Set primary business (first active owner role, or first active business)
      const ownerBusiness = userBusinessAccess.find(access => access.role === "owner");
      sanitizedUser.primaryBusiness = ownerBusiness ? {
        businessId: ownerBusiness.businessId,
        businessName: ownerBusiness.businessName,
        businessSlug: ownerBusiness.businessSlug,
        industryType: ownerBusiness.industryType,
        role: ownerBusiness.role,
        permissions: ownerBusiness.permissions,
        isActive: ownerBusiness.isActive,
      } : sanitizedUser.businessAccess[0];
    }

    console.log(`[Auth] Successfully retrieved user data for ID: ${userId}`);
    return sanitizedUser;
  } catch (error) {
    console.error('[Auth] Error in getUserWithBusinessAccess:', error);
    throw error;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Enhanced session settings with secure defaults
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "desibazaar-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: app.get("env") === "production" ? "strict" : "lax",
      path: "/",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
    name: "desibazaar.sid",
  };

  // Enable trust proxy in production
  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  // Session and passport middleware setup
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Passport local strategy configuration - using email as username
  passport.use(
    new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
      try {
        console.log(`[Auth] Login attempt for email: ${email}`);

        const [userWithPassword] = await db
          .select()
          .from(platformUsers)
          .where(eq(platformUsers.email, email))
          .limit(1);

        if (!userWithPassword) {
          console.log(`[Auth] Login failed: User not found - ${email}`);
          return done(null, false, { message: "Incorrect email." });
        }

        const isMatch = await crypto.compare(password, userWithPassword.passwordHash);
        if (!isMatch) {
          console.log(`[Auth] Login failed: Invalid password - ${email}`);
          return done(null, false, { message: "Incorrect password." });
        }

        const sanitizedUser = await getUserWithBusinessAccess(userWithPassword.id);
        if (!sanitizedUser) {
          console.log(`[Auth] Login failed: Could not load user data - ${email}`);
          return done(null, false, { message: "Failed to load user data." });
        }

        console.log(`[Auth] Login successful: ${email}`);
        return done(null, sanitizedUser);
      } catch (err) {
        console.error('[Auth] Login error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`[Auth] Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Auth] Deserializing user: ${id}`);
      const user = await getUserWithBusinessAccess(id);
      if (!user) {
        console.log(`[Auth] Deserialization failed: User not found - ${id}`);
        return done(null, false);
      }
      console.log(`[Auth] Successfully deserialized user: ${id}`);
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  // API Routes with proper error handling
  const authRouter = express.Router();

  // Ensure JSON content type for all auth routes
  authRouter.use((req, res, next) => {
    res.type('json');
    next();
  });

  authRouter.post("/login", (req, res) => {
    console.log('[Auth] Legacy login endpoint accessed - redirecting to simplified auth');
    res.status(410).json({
      ok: false,
      message: "This endpoint has been deprecated. Please use /api/simple/login instead.",
      redirectTo: "/api/simple/login",
      deprecated: true
    });
  });

  authRouter.post("/register", (req, res) => {
    console.log('[Auth] Legacy register endpoint accessed - redirecting to simplified auth');
    const { business } = req.body;
    
    if (business && business.name) {
      // Business registration
      res.status(410).json({
        ok: false,
        message: "Business registration has moved. Please use /api/simple/register/business instead.",
        redirectTo: "/api/simple/register/business",
        deprecated: true
      });
    } else {
      // Customer registration
      res.status(410).json({
        ok: false,
        message: "Customer registration has moved. Please use /api/simple/register/customer instead.",
        redirectTo: "/api/simple/register/customer", 
        deprecated: true
      });
    }
  });

  authRouter.post("/logout", (req, res) => {
    console.log('[Auth] Legacy logout endpoint accessed - redirecting to simplified auth');
    res.status(410).json({
      ok: false,
      message: "This endpoint has been deprecated. Please use /api/simple/logout instead.",
      redirectTo: "/api/simple/logout",
      deprecated: true
    });
  });

  authRouter.get("/user", (req, res) => {
    console.log('[Auth] Legacy user endpoint accessed - redirecting to simplified auth');
    res.status(410).json({
      ok: false,
      message: "This endpoint has been deprecated. Please use /api/simple/user instead.",
      redirectTo: "/api/simple/user",
      deprecated: true
    });
  });

  // Mount auth routes under /api prefix
  app.use("/api", authRouter);

  return app;
}