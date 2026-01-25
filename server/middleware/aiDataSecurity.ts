import { Request, Response, NextFunction } from 'express';

/**
 * AI Data Security Middleware
 * 
 * Ensures AI Genie and other AI services can only access public data
 * Implements the principle of least privilege for AI integrations
 */

export const aiDataSecurityMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Add security headers
  res.setHeader('X-AI-Data-Classification', 'public-only');
  res.setHeader('X-Data-Privacy-Level', 'unrestricted');
  
  // Log AI access for audit trail
  console.log(`[AI-PUBLIC-ACCESS] ${req.method} ${req.path} from ${req.ip}`);
  
  // Ensure no authentication tokens are used for public endpoints
  if (req.headers.authorization) {
    console.warn('[AI-SECURITY-WARNING] Authorization header detected on public AI endpoint');
    // Remove auth headers to prevent accidental private data access
    delete req.headers.authorization;
  }
  
  // Add response interceptor to sanitize any accidental private data
  const originalJson = res.json;
  res.json = function(data: any) {
    const sanitized = sanitizeResponse(data);
    return originalJson.call(this, sanitized);
  };
  
  next();
};

/**
 * Sanitize response to ensure no private data leaks
 */
function sanitizeResponse(data: any): any {
  if (!data) return data;
  
  // List of private fields that should NEVER be exposed
  const privateFields = [
    'password', 'email', 'phone', 'address', 'userId',
    'staffId', 'customerId', 'salary', 'wage', 'hourlyRate',
    'ssn', 'taxId', 'bankAccount', 'internalNotes',
    'supplierInfo', 'costPrice', 'profit', 'revenue'
  ];
  
  // Recursively remove private fields
  if (typeof data === 'object') {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeResponse(item));
    } else {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(data)) {
        // Check if field name suggests private data
        const isPrivate = privateFields.some(field => 
          key.toLowerCase().includes(field.toLowerCase())
        );
        
        if (!isPrivate) {
          cleaned[key] = sanitizeResponse(value);
        }
      }
      return cleaned;
    }
  }
  
  return data;
}

/**
 * AI Genie Surrogate Middleware
 * 
 * Allows AI Genie to act on behalf of users but with restrictions
 */
export const aiGenieSurrogateMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const aiGenieToken = req.headers['x-ai-genie-token'];
  const userContext = req.headers['x-user-context']; // Contains user intent, not credentials
  
  if (aiGenieToken) {
    // Verify AI Genie token (in production, validate against secure store)
    if (aiGenieToken !== process.env.AI_GENIE_PUBLIC_TOKEN) {
      return res.status(403).json({ 
        error: "Invalid AI Genie token",
        message: "AI services must use valid public access tokens"
      });
    }
    
    // Add AI context to request
    (req as any).aiContext = {
      isAiGenie: true,
      userIntent: userContext, // What the user wants to do
      accessLevel: 'public-only',
      capabilities: [
        'read-public-business-info',
        'check-general-availability',
        'provide-recommendations',
        'answer-general-questions'
      ],
      restrictions: [
        'no-private-data-access',
        'no-financial-transactions',
        'no-personal-info-exposure',
        'no-internal-operations-data'
      ]
    };
    
    console.log(`[AI-GENIE-ACCESS] Acting as surrogate for user intent: ${userContext}`);
  }
  
  next();
};

/**
 * Public Data Only Guard
 * 
 * Ensures endpoints marked as public don't accidentally expose private data
 */
export const publicDataOnlyGuard = (allowedFields: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const originalJson = res.json;
    
    res.json = function(data: any) {
      // Filter response to only include allowed fields
      const filtered = filterAllowedFields(data, allowedFields);
      return originalJson.call(this, filtered);
    };
    
    next();
  };
};

function filterAllowedFields(data: any, allowedFields: string[]): any {
  if (!data || typeof data !== 'object') return data;
  
  if (Array.isArray(data)) {
    return data.map(item => filterAllowedFields(item, allowedFields));
  }
  
  const filtered: any = {};
  for (const field of allowedFields) {
    if (field.includes('.')) {
      // Handle nested fields
      const [parent, ...rest] = field.split('.');
      if (data[parent]) {
        filtered[parent] = filterAllowedFields(
          data[parent], 
          rest.map(f => rest.join('.'))
        );
      }
    } else if (data.hasOwnProperty(field)) {
      filtered[field] = data[field];
    }
  }
  
  return filtered;
}