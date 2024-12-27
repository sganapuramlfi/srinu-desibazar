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
    return this.json({
      ok: true,
      message,
      ...(data && { data })
    });
  };

  // Add error response method
  res.error = function(message: string, statusCode: number = 400) {
    return this.status(statusCode).json({
      ok: false,
      message
    });
  };

  // Override the default send method to ensure JSON
  const originalSend = res.send;
  res.send = function(data) {
    try {
      // If data is already a string and not JSON, convert it
      if (typeof data === 'string') {
        try {
          JSON.parse(data);
        } catch {
          data = JSON.stringify({
            ok: false,
            message: data
          });
        }
      }

      // Call original send with potentially modified data
      return originalSend.call(this, data);
    } catch (err) {
      console.error('Invalid response format:', err);
      // If not valid JSON, send as proper JSON response
      return originalSend.call(this, JSON.stringify({
        ok: false,
        message: 'Internal Server Error: Invalid response format'
      }));
    }
  };

  // Ensure content type is set to JSON
  res.setHeader('Content-Type', 'application/json');
  next();
}