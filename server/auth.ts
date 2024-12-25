import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express } from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { users, businesses, userRegistrationSchema, type User as SelectUser } from "@db/schema";
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

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "desibazaar-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  // Initialize session middleware
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for user: ${username}`);

        if (!username || !password) {
          console.log('Missing credentials');
          return done(null, false, { message: "Missing credentials" });
        }

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.username, username))
          .limit(1);

        if (!user) {
          console.log(`User not found: ${username}`);
          return done(null, false, { message: "Incorrect username." });
        }

        const isMatch = await crypto.compare(password, user.password);
        console.log(`Password comparison result for ${username}:`, isMatch);

        if (!isMatch) {
          console.log(`Password mismatch for user: ${username}`);
          return done(null, false, { message: "Incorrect password." });
        }

        console.log(`Successful login for user: ${username}`);
        return done(null, user);
      } catch (err) {
        console.error('Login error:', err);
        return done(err);
      }
    })
  );

  passport.serializeUser((user, done) => {
    console.log(`Serializing user: ${user.id}`);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log(`Deserializing user: ${id}`);
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);

      if (!user) {
        console.log(`User not found during deserialization: ${id}`);
        return done(null, false);
      }

      console.log(`Successfully deserialized user: ${id}`);
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
    console.log('Login request body:', req.body);

    passport.authenticate("local", async (err: any, user: Express.User, info: IVerifyOptions) => {
      if (err) {
        console.error('Login error:', err);
        return next(err);
      }

      if (!user) {
        console.log('Login failed:', info.message);
        return res.status(400).json({
          ok: false,
          message: info.message ?? "Login failed"
        });
      }

      req.logIn(user, (err) => {
        if (err) {
          console.error('Session creation failed:', err);
          return next(err);
        }

        console.log(`Login successful: ${user.id}`);
        return res.json({
          ok: true,
          message: "Login successful",
          user: {
            id: user.id,
            username: user.username,
            role: user.role
          },
        });
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    console.log('User session check:', { 
      isAuthenticated: req.isAuthenticated(),
      userId: req.user?.id
    });

    if (req.isAuthenticated()) {
      return res.json(req.user);
    }

    res.status(401).json({
      ok: false,
      message: "Not logged in"
    });
  });

  return app;
}