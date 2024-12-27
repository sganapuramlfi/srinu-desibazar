import { Request, Response, NextFunction } from "express";

// Extend Express Response type to include our custom methods
declare module 'express-serve-static-core' {
  interface Response {
    success: (data?: any, message?: string) => void;
    error: (message: string, statusCode?: number) => void;
  }
}

export function responseHandler(req: Request, res: Response, next: NextFunction) {
  // Add success response method
  res.success = function(data?: any, message: string = "Success") {
    return res.json({
      ok: true,
      message,
      ...(data && { data })
    });
  };

  // Add error response method
  res.error = function(message: string, statusCode: number = 400) {
    return res.status(statusCode).json({
      ok: false,
      message
    });
  };

  // Override the default send method to ensure JSON
  const originalSend = res.send;
  res.send = function(data) {
    try {
      // If data is already a string, try to parse it to validate JSON
      if (typeof data === 'string') {
        JSON.parse(data);
      }
      return originalSend.call(this, data);
    } catch (err) {
      console.error('Invalid JSON response:', err);
      return originalSend.call(this, JSON.stringify({
        ok: false,
        message: 'Internal Server Error: Invalid response format'
      }));
    }
  };

  next();
}
