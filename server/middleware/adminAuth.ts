import { Request, Response, NextFunction } from 'express';
import session from 'express-session';

// Admin credentials (in production, this should be in environment variables)
const ADMIN_CREDENTIALS = {
  username: process.env.ADMIN_USERNAME || 'admin',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

// Extend session type to include admin flag
declare module 'express-session' {
  interface SessionData {
    isAdmin?: boolean;
    adminUsername?: string;
  }
}

export const adminAuthMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Check if user is authenticated as admin
  if (req.session.isAdmin) {
    return next();
  }

  // Return 401 if not authenticated
  return res.status(401).json({ 
    error: 'Admin authentication required',
    message: 'Please login with admin credentials'
  });
};

export const adminLoginHandler = (req: Request, res: Response) => {
  const { username, password } = req.body;

  // Validate credentials
  if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
    // Set admin session
    req.session.isAdmin = true;
    req.session.adminUsername = username;
    
    res.json({ 
      success: true, 
      message: 'Admin login successful',
      user: { username, role: 'admin' }
    });
  } else {
    res.status(401).json({ 
      error: 'Invalid credentials',
      message: 'Username or password is incorrect'
    });
  }
};

export const adminLogoutHandler = (req: Request, res: Response) => {
  req.session.isAdmin = false;
  req.session.adminUsername = undefined;
  
  res.json({ 
    success: true, 
    message: 'Admin logout successful' 
  });
};

export const adminStatusHandler = (req: Request, res: Response) => {
  if (req.session.isAdmin) {
    res.json({
      authenticated: true,
      user: {
        username: req.session.adminUsername,
        role: 'admin'
      }
    });
  } else {
    res.json({
      authenticated: false
    });
  }
};