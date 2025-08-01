import express from 'express';
import { BusinessRegistrationController } from '../modules/core/BusinessRegistrationController';
import { ModuleAwareAuth, UserSession } from '../modules/core/ModuleAwareAuth';
import { DynamicUIController } from '../modules/core/DynamicUIController';
import { ModuleDatabaseManager } from '../modules/core/ModuleDatabaseManager';
import { ModuleRegistry } from '../modules/core/ModuleRegistry';

const router = express.Router();

// Initialize controllers
const businessController = new BusinessRegistrationController();
const authController = new ModuleAwareAuth();
const uiController = new DynamicUIController();
const dbManager = new ModuleDatabaseManager();
const moduleRegistry = ModuleRegistry.getInstance();

// ===============================
// BUSINESS REGISTRATION ENDPOINTS
// ===============================

// Get available industries for registration
router.get('/registration/industries', async (req, res) => {
  try {
    const industries = await businessController.getAvailableIndustries();
    res.json({ industries });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch available industries',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get onboarding steps for specific industry
router.get('/registration/onboarding/:industry', async (req, res) => {
  try {
    const { industry } = req.params;
    const steps = await businessController.getOnboardingSteps(industry as any);
    res.json({ steps });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch onboarding steps',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Register new business
router.post('/registration/business', async (req, res) => {
  try {
    const registrationData = req.body;
    
    // Validate registration
    const validation = await businessController.validateBusinessRegistration(registrationData);
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Registration validation failed',
        details: validation.errors,
        warnings: validation.warnings,
        requiredFields: validation.requiredFields
      });
    }

    // Create business profile
    const result = await businessController.createBusinessProfile(registrationData);
    if (!result.success) {
      return res.status(400).json({
        error: 'Business registration failed',
        details: result.errors
      });
    }

    // Apply database migrations for the selected industry module
    if (result.moduleConfig) {
      await dbManager.applyModuleMigrations();
    }

    res.json({
      success: true,
      businessId: result.businessId,
      moduleConfig: result.moduleConfig,
      message: 'Business registered successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// AUTHENTICATION ENDPOINTS
// ===============================

// User login with module-aware session
router.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const authResult = await authController.authenticateUser({ email, password });
    if (!authResult.success) {
      return res.status(401).json({
        error: 'Authentication failed',
        message: authResult.message
      });
    }

    // Store session
    req.session = authResult.session;

    res.json({
      success: true,
      user: {
        userId: authResult.session!.userId,
        businessId: authResult.session!.businessId,
        role: authResult.session!.role,
        industry: authResult.session!.industry
      },
      enabledModules: authResult.session!.enabledModules,
      permissions: authResult.session!.permissions,
      availableModules: authResult.availableModules
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Login failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get user status with module information
router.get('/auth/status', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userStatus = await authController.getUserStatus(session.userId);
    res.json(userStatus);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch user status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Logout
router.post('/auth/logout', (req, res) => {
  req.session = null;
  res.json({ success: true, message: 'Logged out successfully' });
});

// ===============================
// DYNAMIC UI ENDPOINTS
// ===============================

// Get navigation menu based on enabled modules
router.get('/ui/navigation', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const navigation = await uiController.generateNavigation(session);
    res.json({ navigation });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate navigation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get dashboard layout based on enabled modules
router.get('/ui/dashboard', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const dashboard = await uiController.generateDashboard(session);
    res.json(dashboard);
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate dashboard',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get form fields for specific form type
router.get('/ui/forms/:formType', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { formType } = req.params;
    const fields = await uiController.getFormFields(formType, session);
    res.json({ fields });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to generate form fields',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get available UI components
router.get('/ui/components', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const components = await uiController.getAvailableComponents(session);
    res.json({ components });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch UI components',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// MODULE MANAGEMENT ENDPOINTS
// ===============================

// Get module status for current business
router.get('/modules/status', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const moduleStatus = moduleRegistry.getModuleStatus();
    const migrationStatus = await dbManager.getMigrationStatus();

    res.json({
      ...moduleStatus,
      migrationStatus,
      businessModules: session.enabledModules,
      subscriptions: session.moduleSubscriptions
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch module status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Enable/disable module for business (owner only)
router.post('/modules/:moduleId/toggle', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session || session.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required' });
    }

    const { moduleId } = req.params;
    const { enabled } = req.body;

    if (enabled) {
      // Enable module and apply migrations
      await moduleRegistry.enableModule(moduleId);
      const migrationResult = await dbManager.applyModuleMigrations();
      
      if (!migrationResult.success) {
        return res.status(500).json({
          error: 'Failed to enable module',
          details: migrationResult.errors
        });
      }

      // Generate success notification
      const notification = await uiController.generateModuleStatusNotification(moduleId, 'enabled');
      
      res.json({
        success: true,
        message: `Module ${moduleId} enabled successfully`,
        appliedMigrations: migrationResult.appliedMigrations,
        notification
      });
    } else {
      // Disable module and clean up data
      await moduleRegistry.disableModule(moduleId);
      const cleanupResult = await dbManager.cleanupModuleData(moduleId);
      
      // Generate notification
      const notification = await uiController.generateModuleStatusNotification(moduleId, 'disabled');
      
      res.json({
        success: true,
        message: `Module ${moduleId} disabled successfully`,
        cleanedTables: cleanupResult.cleanedTables,
        notification
      });
    }
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to toggle module',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Subscribe to module (business owner)
router.post('/modules/:moduleId/subscribe', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session || session.role !== 'owner') {
      return res.status(403).json({ error: 'Owner access required' });
    }

    const { moduleId } = req.params;
    const { plan } = req.body; // 'trial', 'basic', 'premium'

    // Mock subscription logic
    const subscription = {
      moduleId,
      businessId: session.businessId,
      plan,
      status: 'active',
      startDate: new Date(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      features: await moduleRegistry.getModuleFeatures(moduleId)
    };

    res.json({
      success: true,
      subscription,
      message: `Successfully subscribed to ${moduleId} module`
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Subscription failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Get module subscription details
router.get('/modules/:moduleId/subscription', async (req, res) => {
  try {
    const session = req.session as UserSession;
    if (!session) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { moduleId } = req.params;
    const subscription = session.moduleSubscriptions.find(s => s.moduleId === moduleId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    // Get module features and usage
    const module = moduleRegistry.getAllModules().find(m => m.config.id === moduleId);
    const features = module?.config.features || [];

    res.json({
      subscription,
      features,
      usage: {
        // Mock usage data
        currentPeriodStart: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        currentPeriodEnd: subscription.expiresAt,
        requestCount: 150,
        limit: 1000
      }
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Failed to fetch subscription details',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// SYSTEM HEALTH ENDPOINTS
// ===============================

// Get system health with module status
router.get('/system/health', async (req, res) => {
  try {
    const moduleHealth = await moduleRegistry.healthCheck();
    const migrationStatus = await dbManager.getMigrationStatus();
    
    const health = {
      status: moduleHealth.status,
      timestamp: new Date().toISOString(),
      modules: moduleHealth.modules,
      database: {
        status: 'healthy',
        migrations: migrationStatus
      },
      services: {
        auth: 'healthy',
        ui: 'healthy',
        registration: 'healthy'
      }
    };

    res.json(health);
  } catch (error) {
    res.status(500).json({ 
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
});

// Initialize database migrations (admin only)
router.post('/system/init-db', async (req, res) => {
  try {
    // This would typically require admin authentication
    await dbManager.initializeMigrationTracking();
    const migrationResult = await dbManager.applyModuleMigrations();

    res.json({
      success: migrationResult.success,
      message: 'Database initialized successfully',
      appliedMigrations: migrationResult.appliedMigrations,
      errors: migrationResult.errors
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Database initialization failed',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// ===============================
// MIDDLEWARE
// ===============================

// Module access middleware
export const requireModuleAccess = (moduleId: string) => {
  return authController.requireModuleAccess(moduleId);
};

// Permission middleware
export const requirePermission = (permission: string) => {
  return authController.requirePermission(permission);
};

export default router;