import passport from "passport";
import { IVerifyOptions, Strategy as LocalStrategy } from "passport-local";
import { type Express, Router } from "express";
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

export function createProtectedRouter(): Router {
  const router = Router();
  router.use((req, res, next) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  });
  return router;
}

export function setupAuth(app: Express) {
  const MemoryStore = createMemoryStore(session);
  const sessionSettings: session.SessionOptions = {
    secret: process.env.REPL_ID || "desibazaar-secret",
    resave: true,
    saveUninitialized: false, 
    cookie: {
      secure: false,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, 
      sameSite: 'lax',
      path: '/'
    },
    store: new MemoryStore({
      checkPeriod: 86400000 
    }),
  };

  if (app.get("env") === "production") {
    app.set("trust proxy", 1);
    sessionSettings.cookie!.secure = true;
  }

  
  app.use((req, res, next) => {
    const origin = req.headers.origin || '*';
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');

    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  
  app.use(session(sessionSettings));

  
  const authMiddleware = [passport.initialize(), passport.session()];
  app.use(['/api/auth', '/api/protected'], authMiddleware);

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

      if (user.role === "business") {
        const [business] = await db
          .select()
          .from(businesses)
          .where(eq(businesses.userId, user.id))
          .limit(1);

        if (business) {
          (user as any).business = business;
          (user as any).needsOnboarding = !business.onboardingCompleted;
        }
      }

      console.log(`Successfully deserialized user: ${id}`);
      done(null, user);
    } catch (err) {
      console.error('Deserialization error:', err);
      done(err);
    }
  });

  const authRouter = Router();

  
  authRouter.post("/register", async (req, res, next) => {
    try {
      console.log('Registration request:', req.body);
      const result = userRegistrationSchema.safeParse(req.body);
      if (!result.success) {
        console.log('Registration validation failed:', result.error.issues);
        return res
          .status(400)
          .json({
            ok: false,
            message: "Invalid input: " + result.error.issues.map((i: any) => i.message).join(", ")
          });
      }

      const { username, password, email, role, business: businessData } = result.data;

      
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1);

      if (existingUser) {
        console.log(`Username already exists: ${username}`);
        return res.status(400).json({ ok: false, message: "Username already exists" });
      }

      
      const hashedPassword = await crypto.hash(password);

      
      const [newUser] = await db
        .insert(users)
        .values({
          username,
          password: hashedPassword,
          email,
          role,
        })
        .returning();

      console.log(`Created new user: ${newUser.id}`);

      
      let businessRecord = null;
      if (role === "business" && businessData) {
        const [business] = await db
          .insert(businesses)
          .values({
            userId: newUser.id,
            name: businessData.name,
            industryType: businessData.industryType,
            description: businessData.description,
            status: "pending",
            onboardingCompleted: false,
          })
          .returning();
        businessRecord = business;
        console.log(`Created business record: ${business.id}`);
      }

      
      req.login(newUser, (err) => {
        if (err) {
          console.error('Login after registration failed:', err);
          return next(err);
        }
        console.log(`Logged in after registration: ${newUser.id}`);
        return res.json({
          ok: true,
          message: "Registration successful",
          user: {
            id: newUser.id,
            username: newUser.username,
            role: newUser.role,
            business: businessRecord,
            needsOnboarding: businessRecord ? true : false,
          },
        });
      });
    } catch (error) {
      console.error('Registration error:', error);
      next(error);
    }
  });

  authRouter.post("/login", (req, res, next) => {
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

      try {
        
        let businessRecord = null;
        if (user.role === "business") {
          const [business] = await db
            .select()
            .from(businesses)
            .where(eq(businesses.userId, user.id))
            .limit(1);
          businessRecord = business;
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
              role: user.role,
              business: businessRecord,
              needsOnboarding: businessRecord ? !businessRecord.onboardingCompleted : false,
            },
          });
        });
      } catch (error) {
        console.error('Login process error:', error);
        next(error);
      }
    })(req, res, next);
  });

  authRouter.post("/logout", (req, res) => {
    console.log(`Logout request for user: ${req.user?.id}`);
    req.logout((err) => {
      if (err) {
        console.error('Logout error:', err);
        return res.status(500).json({
          ok: false,
          message: "Logout failed"
        });
      }

      console.log('Logout successful');
      res.json({
        ok: true,
        message: "Logout successful"
      });
    });
  });

  
  app.use("/api/auth", authRouter);

  
  app.get("/api/user", authMiddleware, (req, res) => {
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