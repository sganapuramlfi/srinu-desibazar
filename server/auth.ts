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

// Define types for user data
type BusinessData = {
  id: number;
  name: string;
  industryType: string;
  status: string;
  onboardingCompleted: boolean;
  description: string | null;
};

type SanitizedUser = {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: Date | null;
  business?: BusinessData;
};

declare global {
  namespace Express {
    interface User extends SanitizedUser {}
  }
}

async function getUserWithBusiness(userId: number): Promise<SanitizedUser | null> {
  try {
    console.log(`[Debug] Fetching user data for ID: ${userId}`);

    // Get user and business data in a single query
    const [result] = await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        role: users.role,
        createdAt: users.createdAt,
        business: businesses
      })
      .from(users)
      .leftJoin(businesses, eq(users.id, businesses.userId))
      .where(eq(users.id, userId))
      .limit(1);

    if (!result) {
      console.log(`[Debug] No user found for ID: ${userId}`);
      return null;
    }

    const { business, ...user } = result;

    // Create base sanitized user
    const sanitizedUser: SanitizedUser = {
      ...user
    };

    // Add business data if user is a business owner and has business data
    if (user.role === "business" && business) {
      console.log(`[Debug] Found business data for user ${userId}:`, business);
      sanitizedUser.business = {
        id: business.id,
        name: business.name,
        industryType: business.industryType,
        status: business.status,
        onboardingCompleted: business.onboardingCompleted ?? false,
        description: business.description,
      };
    }

    console.log(`[Debug] Returning sanitized user:`, sanitizedUser);
    return sanitizedUser;
  } catch (error) {
    console.error('[Debug] Error in getUserWithBusiness:', error);
    throw error;
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "desibazaar-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: app.get("env") === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: "lax",
      path: "/",
    },
    store: new MemoryStore({
      checkPeriod: 86400000, // 24 hours
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`[Debug] Attempting login for user: ${username}`);

        // Get user with password for verification
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`[Debug] User not found: ${username}`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        console.log(`[Debug] Password verification result:`, isMatch);

        if (!isMatch) {
          console.log(`[Debug] Password mismatch for user: ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        // Get sanitized user data
        const sanitizedUser = await getUserWithBusiness(user.id);
        if (!sanitizedUser) {
          console.log(`[Debug] Failed to get sanitized user data`);
          return done(null, false, { message: "Failed to load user data." });
        }

        console.log(`[Debug] Login successful:`, sanitizedUser);
        return done(null, sanitizedUser);
      } catch (err) {
        console.error('[Debug] Login error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`[Debug] Serializing user:`, user);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`[Debug] Deserializing user ID: ${id}`);
      const user = await getUserWithBusiness(id);

      if (!user) {
        console.log(`[Debug] User not found during deserialization: ${id}`);
        return done(null, false);
      }

      console.log(`[Debug] Successfully deserialized user:`, user);
      done(null, user);
    } catch (err) {
      console.error('[Debug] Deserialization error:', err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('[Debug] Login request body:', req.body);

    passport.authenticate("local", (err: any, user: SanitizedUser | false, info: IVerifyOptions) => {
      if (err) {
        console.error('[Debug] Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('[Debug] Login failed:', info.message);
        return res.status(400).json({
          ok: false,
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('[Debug] Session creation failed:', err);
          return next(err);
        }

        console.log(`[Debug] Login successful:`, user);

        return res.json({
          ok: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role,
            business: user.business
          }
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('[Debug] Logout error:', err);
        return res.status(500).json({
          ok: false,
          message: "Logout failed"
        });
      }

      res.json({
        ok: true,
        message: "Logout successful"
      });
    });
  });

  app.get("/api/user", (req, res) => {
    console.log('[Debug] User session check:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id,
      userRole: req.user?.role,
      businessId: req.user?.business?.id
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in"
      });
    }

    // Return sanitized user data
    const { id, username, email, role, createdAt, business } = req.user;
    return res.json({
      id,
      username,
      email,
      role,
      createdAt,
      business
    });
  });
}