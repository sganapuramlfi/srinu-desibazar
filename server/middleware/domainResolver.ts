import { Request, Response, NextFunction } from 'express';
import { getTenantByDomain } from '../services/domainService.js';

// Extend Express Request type to include domain tenant context
declare global {
  namespace Express {
    interface Request {
      domainTenant?: {
        businessId: number;
        domain: string;
        resolvedVia: 'domain';
      };
    }
  }
}

/**
 * Middleware to resolve tenant from hostname
 * Checks for subdomain or custom domain and populates request context
 *
 * Examples:
 * - my-salon.desibazaar.com -> businessId resolved from subdomain
 * - mysalon.com -> businessId resolved from custom domain
 * - desibazaar.com -> no tenant resolution (main site)
 */
export async function domainResolverMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const hostname = req.hostname;

  // Main platform domains (no tenant resolution)
  const platformDomains = [
    'desibazaar.com',
    'www.desibazaar.com',
    'localhost',
    '127.0.0.1',
  ];

  // Skip resolution for main platform domains
  if (platformDomains.includes(hostname)) {
    return next();
  }

  try {
    // Try to resolve tenant from domain
    const businessId = await getTenantByDomain(hostname);

    if (businessId) {
      // Populate tenant context from domain
      req.domainTenant = {
        businessId,
        domain: hostname,
        resolvedVia: 'domain',
      };

      // Add header to indicate domain-based routing
      res.setHeader('X-Tenant-Source', 'domain');
      res.setHeader('X-Tenant-Domain', hostname);
    }
  } catch (error) {
    console.error('Domain resolution error:', error);
    // Don't fail the request, just skip tenant resolution
  }

  next();
}

/**
 * Middleware to require domain-based tenant context
 * Use this for routes that MUST be accessed via tenant domain
 */
export function requireDomainTenant(
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (!req.domainTenant) {
    return res.status(403).json({
      error: 'Domain required',
      message: 'This endpoint must be accessed via a business domain (e.g., your-business.desibazaar.com)',
      code: 'DOMAIN_REQUIRED',
    });
  }

  next();
}

/**
 * Middleware to extract business context from either domain or API key
 * Prefers domain resolution over API key
 */
export function extractBusinessContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  let businessId: number | undefined;
  let source: string | undefined;

  // Priority 1: Domain-based tenant
  if (req.domainTenant) {
    businessId = req.domainTenant.businessId;
    source = 'domain';
  }
  // Priority 2: API key authentication
  else if (req.apiAuth) {
    businessId = req.apiAuth.businessId;
    source = 'api_key';
  }
  // Priority 3: Session user with business context
  else if (req.user && (req.user as any).businessId) {
    businessId = (req.user as any).businessId;
    source = 'session';
  }

  if (businessId) {
    // Populate standardized business context
    (req as any).businessId = businessId;
    (req as any).businessContextSource = source;

    // Add response header
    res.setHeader('X-Business-Context', businessId.toString());
    res.setHeader('X-Business-Source', source!);
  }

  next();
}

/**
 * Middleware to enforce business context (from any source)
 * Use this when a route requires business context but doesn't care about the source
 */
export function requireAnyBusinessContext(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const businessId = (req as any).businessId;

  if (!businessId) {
    return res.status(403).json({
      error: 'Business context required',
      message: 'Access this endpoint via business domain, API key, or authenticated session',
      code: 'BUSINESS_CONTEXT_REQUIRED',
    });
  }

  next();
}

/**
 * Utility function to get business ID from request (any source)
 */
export function getBusinessIdFromRequest(req: Request): number | null {
  // Check domain tenant
  if (req.domainTenant) {
    return req.domainTenant.businessId;
  }

  // Check API auth
  if (req.apiAuth) {
    return req.apiAuth.businessId;
  }

  // Check standardized context
  const businessId = (req as any).businessId;
  if (businessId) {
    return businessId;
  }

  // Check session user
  if (req.user && (req.user as any).businessId) {
    return (req.user as any).businessId;
  }

  return null;
}

/**
 * Middleware for tenant-specific routes
 * Redirects to correct subdomain if accessed from main domain
 */
export function redirectToTenantDomain(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const hostname = req.hostname;

  // If already on a tenant domain, continue
  if (req.domainTenant) {
    return next();
  }

  // If on main domain, redirect to tenant subdomain
  if (hostname === 'desibazaar.com' || hostname === 'www.desibazaar.com') {
    const businessId = (req as any).businessId;

    if (businessId) {
      // TODO: Get business slug and redirect to subdomain
      // For now, show error message
      return res.status(400).json({
        error: 'Access via tenant domain',
        message: 'Please access this resource via your business subdomain: your-business.desibazaar.com',
        code: 'TENANT_DOMAIN_REQUIRED',
      });
    }
  }

  next();
}
