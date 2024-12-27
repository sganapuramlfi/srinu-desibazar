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

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      console.log(`[Auth] No user found for ID: ${userId}`);
      return null;
    }

    const sanitizedUser: SanitizedUser = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt
    };

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

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || process.env.REPL_ID || "desibazaar-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000,
    }),
    name: "desibazaar.sid"
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Auth] Login attempt for username: ${username}`);

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

        const user = await getUserWithBusiness(userWithPassword.id);
        if (!user) {
          console.log(`[Auth] Login failed: Could not load user data - ${username}`);
          return done(null, false, { message: "Failed to load user data." });
        }

        console.log(`[Auth] Login successful: ${username}`);
        return done(null, user);
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
      done(null, user);
    } catch (err) {
      console.error('[Auth] Deserialization error:', err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: Express.User | false, info: IVerifyOptions) => {
      try {
        if (err) {
          console.error('[Auth] Login error:', err);
          return res.status(500).json({ok: false, message: "Internal server error during login"});
        }

        if (!user) {
          console.log('[Auth] Login failed:', info.message);
          return res.status(400).json({ok: false, message: info.message ?? "Login failed"});
        }

        req.logIn(user, (err) => {
          if (err) {
            console.error('[Auth] Login error during session creation:', err);
            return res.status(500).json({ok: false, message: "Failed to create session"});
          }

          console.log(`[Auth] Login successful for user: ${user.username}`);
          return res.json({ok: true, message: "Login successful", user});
        });
      } catch (error) {
        console.error('[Auth] Unexpected login error:', error);
        return res.status(500).json({ok: false, message: "Internal server error"});
      }
    })(req, res, next);
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { username, password, email, role, business } = req.body;

      // Check if user already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        return res.status(400).json({ok: false, message: "Username already exists"});
      }

      // Hash the password
      const hashedPassword = await crypto.hash(password);

      // Create the new user
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          role,
          createdAt: new Date()
        })
        .returning();

      // Create business record if needed
      let businessData = null;
      if (role === "business" && business) {
        const [createdBusiness] = await db
          .insert(businesses)
          .values({
            userId: newUser.id,
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

      // Create sanitized user data
      const userData = {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        createdAt: newUser.createdAt,
        business: businessData ? {
          id: businessData.id,
          name: businessData.name,
          industryType: businessData.industryType,
          status: businessData.status,
          onboardingCompleted: businessData.onboardingCompleted || false,
          description: businessData.description
        } : undefined
      };

      // Auto-login after registration
      req.login(userData, (err) => {
        if (err) {
          console.error('[Auth] Auto-login failed:', err);
          return res.status(500).json({ok: false, message: "Registration successful but auto-login failed"});
        }

        console.log(`[Auth] Registration and auto-login successful: ${newUser.username}`);
        return res.json({ok: true, message: "Registration successful", user: userData});
      });
    } catch (error) {
      console.error('[Auth] Registration error:', error);
      return res.status(500).json({ok: false, message: "Failed to create account"});
    }
  });

  app.post("/api/logout", (req, res) => {
    const username = req.user?.username;
    console.log(`[Auth] Processing logout request for user: ${username}`);

    if (!req.isAuthenticated()) {
      return res.json({ok: true, message: "Already logged out"});
    }

    req.logout((err) => {
      if (err) {
        console.error('[Auth] Logout error:', err);
        return res.status(500).json({ok: false, message: "Logout failed"});
      }

      console.log(`[Auth] Logout successful: ${username}`);
      return res.json({ok: true, message: "Logout successful"});
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('[Auth] User info requested');

    if (!req.isAuthenticated()) {
      console.log('[Auth] Unauthorized access to user info');
      return res.status(401).json({ok: false, message: "Not logged in"});
    }

    console.log(`[Auth] User info request successful for: ${req.user.username}`);
    return res.json({ok: true, user: req.user});
  });

  return app;
}