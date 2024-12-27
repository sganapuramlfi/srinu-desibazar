import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, businesses } from "@db/schema";
import { db } from "@db";
import { eq } from "drizzle-orm";
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

// Define types for business data
interface BusinessData {
  id: number;
  name: string;
  industryType: string;
  status: string;
  onboardingCompleted: boolean;
  description: string | null;
}

interface SanitizedUser {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: Date | null;
  business?: BusinessData;
}

declare global {
  namespace Express {
    interface User extends SanitizedUser {}
  }
}

async function getUserWithBusiness(userId: number): Promise<SanitizedUser | null> {
  try {
    console.log(`[Auth] Fetching user data for ID: ${userId}`);

    // Get user data without password
    const [user] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log(`[Auth] No user found for ID: ${userId}`);
      return null;
    }

    // Create sanitized user object
    const sanitizedUser: SanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

    // If user is a business owner, fetch business data
    if (user.role === "business") {
      console.log(`[Auth] Fetching business data for user ID: ${userId}`);
      const [business] = await db
        .select()
        .from(businesses)
        .where(eq(businesses.userId, userId))
        .limit(1);

      if (business) {
        sanitizedUser.business = {
          id: business.id,
          name: business.name,
          industryType: business.industryType,
          status: business.status,
          onboardingCompleted: business.onboardingCompleted || false,
          description: business.description
        };
      }
    }

    console.log(`[Auth] Successfully retrieved user data for ID: ${userId}`);
    return sanitizedUser;
  } catch (error) {
    console.error('[Auth] Error in getUserWithBusiness:', error);
    throw error;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);

  // Enhanced session settings
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
    name: "desibazaar.sid", // Custom session cookie name
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Auth] Login attempt for username: ${username}`);

        // Get user with password for verification
        const [userWithPassword] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!userWithPassword) {
          console.log(`[Auth] Login failed: User not found - ${username}`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, userWithPassword.password);
        if (!isMatch) {
          console.log(`[Auth] Login failed: Invalid password - ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        // Get sanitized user data
        const sanitizedUser = await getUserWithBusiness(userWithPassword.id);
        if (!sanitizedUser) {
          console.log(`[Auth] Login failed: Could not load user data - ${username}`);
          return done(null, false, { message: "Failed to load user data." });
        }

        console.log(`[Auth] Login successful: ${username}`);
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
      const user = await getUserWithBusiness(id);
      if (!user) {
        console.log(`[Auth] Deserialization failed: User not found - ${id}`);
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  // API Routes
  const authRouter = express.Router();

  authRouter.post("/login", (req, res, next) => {
    console.log('[Auth] Processing login request');
    passport.authenticate("local", async (err: any, user: SanitizedUser | false, info: IVerifyOptions) => {
      if (err) {
        console.error('[Auth] Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('[Auth] Login failed:', info.message);
        return res.status(400).json({
          ok: false,
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('[Auth] Login error during session creation:', err);
          return next(err);
        }

        console.log(`[Auth] Login successful for user: ${user.username}`);
        return res.json({
          ok: true,
          message: "Login successful",
          user
        });
      });
    })(req, res, next);
  });

  authRouter.post("/register", async (req, res) => {
    try {
      console.log('[Auth] Processing registration request');
      const { username, password, email, role, business } = req.body;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log(`[Auth] Registration failed: Username exists - ${username}`);
        return res.status(400).json({
          ok: false,
          message: "Username already exists"
        });
      }

      // Hash password
      const hashedPassword = await crypto.hash(password);

      // Create user
      const [user] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          role,
          createdAt: new Date()
        })
        .returning();

      console.log(`[Auth] User created: ${user.id}`);

      // If business owner, create business record
      let businessData = null;
      if (role === "business" && business) {
        console.log(`[Auth] Creating business record for user: ${user.id}`);
        const [createdBusiness] = await db
          .insert(businesses)
          .values({
            userId: user.id,
            name: business.name,
            industryType: business.industryType,
            description: business.description || null,
            status: "active",
            onboardingCompleted: false,
            createdAt: new Date()
          })
          .returning();
        businessData = createdBusiness;
      }

      // Log the user in automatically
      const userData: SanitizedUser = {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
        business: businessData ? {
          id: businessData.id,
          name: businessData.name,
          industryType: businessData.industryType,
          status: businessData.status,
          onboardingCompleted: businessData.onboardingCompleted || false,
          description: businessData.description
        } : undefined
      };

      req.login(userData, (err) => {
        if (err) {
          console.error('[Auth] Auto-login failed:', err);
          return res.status(500).json({
            ok: false,
            message: "Registration successful but auto-login failed"
          });
        }

        console.log(`[Auth] Registration and auto-login successful: ${user.username}`);
        res.json({
          ok: true,
          message: "Registration successful",
          user: {
            ...userData,
            needsOnboarding: role === "business"
          }
        });
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      res.status(500).json({
        ok: false,
        message: "Failed to create account"
      });
    }
  });

  authRouter.post("/logout", (req, res) => {
    const username = req.user?.username;
    console.log(`[Auth] Processing logout request for user: ${username}`);

    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({
          ok: false,
          message: "Logout failed"
        });
      }

      console.log(`[Auth] Logout successful: ${username}`);
      res.json({
        ok: true,
        message: "Logout successful"
      });
    });
  });

  authRouter.get("/user", (req, res) => {
    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthorized access to user info');
      return res.status(401).json({
        ok: false,
        message: "Not logged in"
      });
    }

    console.log(`[Auth] User info requested: ${req.user.username}`);
    res.json({
      ok: true,
      user: req.user
    });
  });

  // Mount auth routes under /api prefix
  app.use("/api", authRouter);

  return app;
}