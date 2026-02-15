import { Request, Response, NextFunction } from 'express';
import { verifyApiKey, checkRateLimit } from '../services/apiKeyService.js';

// Extend Express Request type to include API auth context
declare global {
  namespace Express {
    interface Request {
      apiAuth?: {
        businessId: number;
        scopes: string[];
        authType: 'api_key';
        keyId: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using API keys
 * Expects: Authorization: Bearer key_live_...
 */
export async function apiKeyAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check for API key in Authorization header
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'API key required',
      message: 'Include API key in Authorization header: Authorization: Bearer key_live_...',
      code: 'API_KEY_REQUIRED',
    });
  }

  // Extract API key (remove 'Bearer ' prefix)
  const apiKey = authHeader.substring(7);

  // Verify API key
  const verification = await verifyApiKey(apiKey);

  if (!verification.valid) {
    return res.status(401).json({
      error: 'Invalid API key',
      message: 'API key is invalid, expired, or has been revoked',
      code: 'INVALID_API_KEY',
    });
  }

  // Check rate limit (basic check - enhance with Redis in production)
  const rateLimitCheck = await checkRateLimit(verification.keyId!);

  if (!rateLimitCheck.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many requests. Please try again later.',
      code: 'RATE_LIMIT_EXCEEDED',
      rateLimit: {
        limit: rateLimitCheck.limit,
        remaining: rateLimitCheck.remaining,
      },
    });
  }

  // Populate request context with API auth info
  req.apiAuth = {
    businessId: verification.businessId!,
    scopes: verification.scopes || [],
    authType: 'api_key',
    keyId: verification.keyId!,
  };

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', rateLimitCheck.limit);
  res.setHeader('X-RateLimit-Remaining', rateLimitCheck.remaining);

  next();
}

/**
 * Middleware to verify API key has specific scopes
 * Usage: requireApiScope('read:bookings', 'write:services')
 */
export function requireApiScope(...requiredScopes: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Check if API auth exists (should be set by apiKeyAuthMiddleware)
    if (!req.apiAuth) {
      return res.status(401).json({
        error: 'API authentication required',
        message: 'This endpoint requires API key authentication',
        code: 'API_AUTH_REQUIRED',
      });
    }

    // Check if all required scopes are present
    const hasAllScopes = requiredScopes.every((scope) =>
      req.apiAuth!.scopes.includes(scope)
    );

    if (!hasAllScopes) {
      return res.status(403).json({
        error: 'Insufficient API permissions',
        message: `This endpoint requires the following scopes: ${requiredScopes.join(', ')}`,
        code: 'INSUFFICIENT_SCOPES',
        required: requiredScopes,
        current: req.apiAuth.scopes,
      });
    }

    next();
  };
}

/**
 * Middleware that accepts EITHER session auth OR API key auth
 * Checks session first, then falls back to API key
 */
export async function hybridAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check if user is authenticated via session
  if (req.isAuthenticated && req.isAuthenticated() && req.user) {
    // Session auth is active, proceed
    return next();
  }

  // Fall back to API key auth
  return apiKeyAuthMiddleware(req, res, next);
}

/**
 * Middleware to verify business context from either source
 * Works with both session auth and API key auth
 */
export function requireBusinessContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  // Check API auth
  if (req.apiAuth) {
    // API key auth provides direct business context
    (req as any).businessId = req.apiAuth.businessId;
    return next();
  }

  // Check session auth (assuming businessId is in user object)
  if (req.user && (req.user as any).businessId) {
    (req as any).businessId = (req.user as any).businessId;
    return next();
  }

  // No business context available
  return res.status(403).json({
    error: 'Business context required',
    message: 'This endpoint requires business context. Authenticate with a business-scoped API key or session.',
    code: 'BUSINESS_CONTEXT_REQUIRED',
  });
}

/**
 * Optional API key auth - doesn't fail if key is missing, but validates if present
 */
export async function optionalApiKeyAuth(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  // If no auth header, just continue
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  // If auth header exists, validate it
  return apiKeyAuthMiddleware(req, res, next);
}
