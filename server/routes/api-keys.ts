import { Router } from 'express';
import {
  createApiKey,
  listApiKeys,
  revokeApiKey,
  deleteApiKey,
  updateApiKey,
  rotateApiKey,
} from '../services/apiKeyService.js';

const router = Router();

/**
 * POST /api/businesses/:businessId/api-keys
 * Create a new API key for a business
 *
 * Body:
 * {
 *   "name": "Production API",
 *   "description": "Key for production mobile app",
 *   "scopes": ["read:bookings", "write:bookings", "read:services"],
 *   "expiresInDays": 365,
 *   "rateLimit": 5000
 * }
 */
router.post('/businesses/:businessId/api-keys', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { name, description, scopes, expiresInDays, rateLimit } = req.body;

    // Validate required fields
    if (!name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'API key name is required',
      });
    }

    if (!scopes || !Array.isArray(scopes) || scopes.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'At least one scope is required',
      });
    }

    // Get user ID from session (TODO: properly integrate with auth)
    const createdBy = (req.user as any)?.id || 1;

    // Create API key
    const apiKey = await createApiKey({
      businessId,
      name,
      description,
      scopes,
      expiresInDays,
      rateLimit,
      createdBy,
    });

    // Return the raw key ONCE (never stored, never shown again)
    res.status(201).json({
      success: true,
      message: 'API key created successfully. Save the key now - you won\'t see it again!',
      data: {
        keyId: apiKey.keyId,
        rawKey: apiKey.rawKey,
        keyPrefix: apiKey.keyPrefix,
      },
      warning: 'Store this API key securely. It will not be shown again.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'API key creation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/api-keys
 * List all API keys for a business (without revealing actual keys)
 */
router.get('/businesses/:businessId/api-keys', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const apiKeys = await listApiKeys(businessId);

    res.json({
      success: true,
      data: apiKeys,
      count: apiKeys.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list API keys',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/api-keys/:keyId
 * Get details of a specific API key
 */
router.get('/businesses/:businessId/api-keys/:keyId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const keyId = req.params.keyId;

    const apiKeys = await listApiKeys(businessId);
    const apiKey = apiKeys.find((key) => key.keyId === keyId);

    if (!apiKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      data: apiKey,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get API key',
      message: error.message,
    });
  }
});

/**
 * PATCH /api/businesses/:businessId/api-keys/:keyId
 * Update API key metadata (name, description, scopes, rate limit)
 *
 * Body:
 * {
 *   "name": "Updated name",
 *   "description": "Updated description",
 *   "scopes": ["read:bookings", "write:bookings"],
 *   "rateLimit": 10000
 * }
 */
router.patch('/businesses/:businessId/api-keys/:keyId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const keyId = req.params.keyId;
    const { name, description, scopes, rateLimit } = req.body;

    const updated = await updateApiKey({
      keyId,
      businessId,
      name,
      description,
      scopes,
      rateLimit,
    });

    if (!updated) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key updated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'API key update failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/businesses/:businessId/api-keys/:keyId/revoke
 * Revoke (deactivate) an API key
 */
router.post('/businesses/:businessId/api-keys/:keyId/revoke', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const keyId = req.params.keyId;

    const revoked = await revokeApiKey(keyId, businessId);

    if (!revoked) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key revoked successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'API key revocation failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/businesses/:businessId/api-keys/:keyId
 * Permanently delete an API key
 */
router.delete('/businesses/:businessId/api-keys/:keyId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const keyId = req.params.keyId;

    const deleted = await deleteApiKey(keyId, businessId);

    if (!deleted) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'API key deletion failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/businesses/:businessId/api-keys/:keyId/rotate
 * Rotate an API key (create new key, deactivate old)
 */
router.post('/businesses/:businessId/api-keys/:keyId/rotate', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const keyId = req.params.keyId;
    const createdBy = (req.user as any)?.id || 1;

    const newKey = await rotateApiKey({
      oldKeyId: keyId,
      businessId,
      createdBy,
    });

    if (!newKey) {
      return res.status(404).json({
        error: 'API key not found',
      });
    }

    res.json({
      success: true,
      message: 'API key rotated successfully. Old key has been revoked.',
      data: {
        keyId: newKey.keyId,
        rawKey: newKey.rawKey,
        keyPrefix: newKey.keyPrefix,
      },
      warning: 'Store this new API key securely. It will not be shown again.',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'API key rotation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/api-keys/scopes
 * List available API key scopes
 */
router.get('/api-keys/scopes', (req, res) => {
  const scopes = [
    {
      scope: 'read:bookings',
      description: 'View bookings and appointments',
    },
    {
      scope: 'write:bookings',
      description: 'Create, update, and cancel bookings',
    },
    {
      scope: 'read:services',
      description: 'View services and products',
    },
    {
      scope: 'write:services',
      description: 'Create and update services',
    },
    {
      scope: 'read:customers',
      description: 'View customer information',
    },
    {
      scope: 'write:customers',
      description: 'Create and update customer records',
    },
    {
      scope: 'read:staff',
      description: 'View staff information',
    },
    {
      scope: 'write:staff',
      description: 'Manage staff schedules and assignments',
    },
    {
      scope: 'read:analytics',
      description: 'View analytics and reports',
    },
    {
      scope: 'read:reviews',
      description: 'View customer reviews',
    },
    {
      scope: 'write:reviews',
      description: 'Respond to customer reviews',
    },
    {
      scope: 'admin:full',
      description: 'Full administrative access (use with caution)',
    },
  ];

  res.json({
    success: true,
    data: scopes,
    count: scopes.length,
  });
});

export default router;
