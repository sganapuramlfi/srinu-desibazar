import { Router } from 'express';
import {
  provisionTenant,
  activateTenant,
  suspendTenant,
  resumeTenant,
  deleteTenant,
  getLifecycleHistory,
  getTenantStatus,
} from '../services/tenantProvisioningService.js';
import {
  exportTenantData,
  listExports,
  getExportStatus,
  getExportFilePath,
  deleteExport,
} from '../services/tenantDataExportService.js';
import {
  createSubdomain,
  addCustomDomain,
  verifyDomain,
  listDomains,
  setPrimaryDomain,
  removeDomain,
  isSubdomainAvailable,
  isCustomDomainAvailable,
} from '../services/domainService.js';

const router = Router();

// =============================================================================
// TENANT LIFECYCLE MANAGEMENT (Admin only)
// =============================================================================

/**
 * POST /api/admin/tenants/provision
 * Provision a new tenant (usually automated during registration)
 */
router.post('/admin/tenants/provision', async (req, res) => {
  try {
    const { name, industryType, ownerUserId, subscriptionPlanId, slug, tenantTier, dataResidency } = req.body;

    if (!name || !industryType || !ownerUserId || !subscriptionPlanId) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['name', 'industryType', 'ownerUserId', 'subscriptionPlanId'],
      });
    }

    const result = await provisionTenant({
      name,
      industryType,
      ownerUserId,
      subscriptionPlanId,
      slug,
      tenantTier,
      dataResidency,
    });

    res.status(201).json({
      success: true,
      message: 'Tenant provisioned successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Tenant provisioning failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/tenants/:id/activate
 * Activate a tenant after onboarding complete
 */
router.post('/admin/tenants/:id/activate', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const activatedBy = (req.user as any)?.id;

    await activateTenant(businessId, activatedBy);

    res.json({
      success: true,
      message: 'Tenant activated successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Tenant activation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/tenants/:id/suspend
 * Suspend a tenant (payment failure, policy violation)
 */
router.post('/admin/tenants/:id/suspend', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const { reason } = req.body;
    const suspendedBy = (req.user as any)?.id;

    if (!reason) {
      return res.status(400).json({
        error: 'Suspension reason required',
      });
    }

    await suspendTenant(businessId, reason, suspendedBy);

    res.json({
      success: true,
      message: 'Tenant suspended successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Tenant suspension failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/admin/tenants/:id/resume
 * Resume a suspended tenant
 */
router.post('/admin/tenants/:id/resume', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const resumedBy = (req.user as any)?.id;

    await resumeTenant(businessId, resumedBy);

    res.json({
      success: true,
      message: 'Tenant resumed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Tenant resume failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/admin/tenants/:id
 * Soft delete a tenant (GDPR)
 */
router.delete('/admin/tenants/:id', async (req, res) => {
  try {
    const businessId = parseInt(req.params.id);
    const { reason } = req.body;
    const deletedBy = (req.user as any)?.id;

    await deleteTenant(businessId, deletedBy, reason);

    res.json({
      success: true,
      message: 'Tenant deleted successfully (soft delete)',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Tenant deletion failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/status
 * Get tenant status and metadata
 */
router.get('/businesses/:businessId/status', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const status = await getTenantStatus(businessId);

    if (!status) {
      return res.status(404).json({
        error: 'Tenant not found',
      });
    }

    res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get tenant status',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/lifecycle-events
 * Get lifecycle event history
 */
router.get('/businesses/:businessId/lifecycle-events', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

    const events = await getLifecycleHistory(businessId, limit);

    res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get lifecycle events',
      message: error.message,
    });
  }
});

// =============================================================================
// DATA EXPORT (GDPR Compliance)
// =============================================================================

/**
 * POST /api/businesses/:businessId/exports
 * Request a data export
 */
router.post('/businesses/:businessId/exports', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { exportType = 'full' } = req.body;
    const requestedBy = (req.user as any)?.id || 1; // TODO: Get from auth

    const exportId = await exportTenantData(businessId, requestedBy, exportType);

    res.status(202).json({
      success: true,
      message: 'Export request submitted',
      data: {
        exportId,
        status: 'pending',
      },
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Export request failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/exports
 * List all exports for a business
 */
router.get('/businesses/:businessId/exports', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const exports = await listExports(businessId);

    res.json({
      success: true,
      data: exports,
      count: exports.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list exports',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/exports/:exportId
 * Get export status
 */
router.get('/businesses/:businessId/exports/:exportId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const exportId = parseInt(req.params.exportId);

    const exportRecord = await getExportStatus(exportId, businessId);

    if (!exportRecord) {
      return res.status(404).json({
        error: 'Export not found',
      });
    }

    res.json({
      success: true,
      data: exportRecord,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to get export status',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/exports/:exportId/download
 * Download export file
 */
router.get('/businesses/:businessId/exports/:exportId/download', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const exportId = parseInt(req.params.exportId);

    const filePath = await getExportFilePath(exportId, businessId);

    res.download(filePath, `export_${businessId}_${exportId}.json`);
  } catch (error: any) {
    res.status(500).json({
      error: 'Download failed',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/businesses/:businessId/exports/:exportId
 * Delete an export
 */
router.delete('/businesses/:businessId/exports/:exportId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const exportId = parseInt(req.params.exportId);

    await deleteExport(exportId, businessId);

    res.json({
      success: true,
      message: 'Export deleted successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to delete export',
      message: error.message,
    });
  }
});

// =============================================================================
// DOMAIN MANAGEMENT
// =============================================================================

/**
 * POST /api/businesses/:businessId/domains/subdomain
 * Create subdomain for business
 */
router.post('/businesses/:businessId/domains/subdomain', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { subdomain } = req.body;

    const result = await createSubdomain(businessId, subdomain);

    res.status(201).json({
      success: true,
      message: 'Subdomain created successfully',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Subdomain creation failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/businesses/:businessId/domains/custom
 * Add custom domain (Enterprise only)
 */
router.post('/businesses/:businessId/domains/custom', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const { domain } = req.body;

    if (!domain) {
      return res.status(400).json({
        error: 'Domain required',
      });
    }

    const result = await addCustomDomain(businessId, domain);

    res.status(201).json({
      success: true,
      message: 'Custom domain added. Please verify DNS records.',
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Custom domain creation failed',
      message: error.message,
    });
  }
});

/**
 * GET /api/businesses/:businessId/domains
 * List all domains for a business
 */
router.get('/businesses/:businessId/domains', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);

    const domains = await listDomains(businessId);

    res.json({
      success: true,
      data: domains,
      count: domains.length,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to list domains',
      message: error.message,
    });
  }
});

/**
 * POST /api/businesses/:businessId/domains/:domainId/verify
 * Verify domain ownership
 */
router.post('/businesses/:businessId/domains/:domainId/verify', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const domainId = parseInt(req.params.domainId);

    const verified = await verifyDomain(domainId, businessId);

    res.json({
      success: true,
      verified,
      message: verified ? 'Domain verified successfully' : 'Domain verification pending',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Domain verification failed',
      message: error.message,
    });
  }
});

/**
 * POST /api/businesses/:businessId/domains/:domainId/set-primary
 * Set domain as primary
 */
router.post('/businesses/:businessId/domains/:domainId/set-primary', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const domainId = parseInt(req.params.domainId);

    await setPrimaryDomain(domainId, businessId);

    res.json({
      success: true,
      message: 'Primary domain updated',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to set primary domain',
      message: error.message,
    });
  }
});

/**
 * DELETE /api/businesses/:businessId/domains/:domainId
 * Remove domain
 */
router.delete('/businesses/:businessId/domains/:domainId', async (req, res) => {
  try {
    const businessId = parseInt(req.params.businessId);
    const domainId = parseInt(req.params.domainId);

    await removeDomain(domainId, businessId);

    res.json({
      success: true,
      message: 'Domain removed successfully',
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to remove domain',
      message: error.message,
    });
  }
});

/**
 * GET /api/domains/check-subdomain/:subdomain
 * Check if subdomain is available
 */
router.get('/domains/check-subdomain/:subdomain', async (req, res) => {
  try {
    const subdomain = req.params.subdomain;

    const available = await isSubdomainAvailable(subdomain);

    res.json({
      success: true,
      subdomain,
      available,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check subdomain availability',
      message: error.message,
    });
  }
});

/**
 * GET /api/domains/check-custom/:domain
 * Check if custom domain is available
 */
router.get('/domains/check-custom/:domain', async (req, res) => {
  try {
    const domain = req.params.domain;

    const available = await isCustomDomainAvailable(domain);

    res.json({
      success: true,
      domain,
      available,
    });
  } catch (error: any) {
    res.status(500).json({
      error: 'Failed to check domain availability',
      message: error.message,
    });
  }
});

export default router;
