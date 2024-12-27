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

// Define types for business data
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
      console.log(`[Debug] No user found for ID: ${userId}`);
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
      const [business] = await db
        .select({
          id: businesses.id,
          name: businesses.name,
          industryType: businesses.industryType,
          status: businesses.status,
          onboardingCompleted: businesses.onboardingCompleted,
          description: businesses.description,
        })
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
        // Get user with password for verification
        const [userWithPassword] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!userWithPassword) {
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, userWithPassword.password);
        if (!isMatch) {
          return done(null, false, { message: "Incorrect password." });
        }

        // Get sanitized user data
        const sanitizedUser = await getUserWithBusiness(userWithPassword.id);
        if (!sanitizedUser) {
          return done(null, false, { message: "Failed to load user data." });
        }

        return done(null, sanitizedUser);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await getUserWithBusiness(id);
      if (!user) {
        return done(null, false);
      }
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // API Routes
  const authRouter = express.Router();

  authRouter.post("/login", (req, res, next) => {
    passport.authenticate("local", async (err: any, user: SanitizedUser | false, info: IVerifyOptions) => {
      if (err) {
        return next(err);
      }

      if (!user) {
        return res.status(400).json({
          ok: false,
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          return next(err);
        }

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
      const { username, password, email, role, business } = req.body;

      // Check if username already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
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

      // If business owner, create business record
      let businessData = null;
      if (role === "business" && business) {
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
      req.login(
        {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          business: businessData
        },
        (err) => {
          if (err) {
            console.error("Auto-login failed:", err);
            return res.status(500).json({
              ok: false,
              message: "Registration successful but auto-login failed"
            });
          }

          res.json({
            ok: true,
            message: "Registration successful",
            user: {
              id: user.id,
              username: user.username,
              email: user.email,
              role: user.role,
              createdAt: user.createdAt,
              business: businessData,
              needsOnboarding: role === "business"
            }
          });
        }
      );
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({
        ok: false,
        message: "Failed to create account"
      });
    }
  });

  authRouter.post("/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
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

  authRouter.get("/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        ok: false,
        message: "Not logged in"
      });
    }

    res.json({
      ok: true,
      user: req.user
    });
  });

  // Mount auth routes under /api prefix
  app.use("/api", authRouter);

  return app;
}