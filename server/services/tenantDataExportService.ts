import { db } from '../../db/index.js';
import {
  tenantDataExports,
  businessTenants,
  bookings,
  businessAccess,
  businessSubscriptions,
  businessDirectory,
  businessSettings,
  customerFavorites,
} from '../../db/index.js';
import { eq } from 'drizzle-orm';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Request a data export for a tenant
 * Creates export record and starts async processing
 */
export async function exportTenantData(
  businessId: number,
  requestedBy: number,
  exportType: 'full' | 'gdpr' | 'backup' = 'full'
): Promise<number> {
  // Create export record
  const [exportRecord] = await db
    .insert(tenantDataExports)
    .values({
      businessId,
      exportType,
      exportFormat: 'json',
      requestedBy,
      status: 'pending',
      progressPercent: 0,
    })
    .returning();

  // Start async export processing (in production, use job queue)
  processDataExport(exportRecord.id, businessId, exportType).catch((error) => {
    console.error('Data export failed:', error);
  });

  return exportRecord.id;
}

/**
 * Process data export asynchronously
 * Collects all tenant data and writes to JSON file
 */
async function processDataExport(
  exportId: number,
  businessId: number,
  exportType: string
): Promise<void> {
  try {
    // Update status to processing
    await db
      .update(tenantDataExports)
      .set({
        status: 'processing',
        startedAt: new Date(),
      })
      .where(eq(tenantDataExports.id, exportId));

    // Collect data from all tables with businessId
    const exportData: any = {
      export_metadata: {
        export_id: exportId,
        export_type: exportType,
        business_id: businessId,
        exported_at: new Date().toISOString(),
        format: 'json',
      },
      tables: {},
    };

    let tablesIncluded: string[] = [];
    let totalRecords = 0;

    // Progress tracking helper
    const updateProgress = async (percent: number) => {
      await db
        .update(tenantDataExports)
        .set({ progressPercent: percent })
        .where(eq(tenantDataExports.id, exportId));
    };

    // 1. Business tenant data (10%)
    await updateProgress(10);
    const [business] = await db
      .select()
      .from(businessTenants)
      .where(eq(businessTenants.id, businessId));

    if (business) {
      exportData.tables.business_tenants = [business];
      tablesIncluded.push('business_tenants');
      totalRecords += 1;
    }

    // 2. Business access (users with access to this business) (20%)
    await updateProgress(20);
    const accessRecords = await db
      .select()
      .from(businessAccess)
      .where(eq(businessAccess.businessId, businessId));

    if (accessRecords.length > 0) {
      exportData.tables.business_access = accessRecords;
      tablesIncluded.push('business_access');
      totalRecords += accessRecords.length;
    }

    // 3. Subscriptions (30%)
    await updateProgress(30);
    const subscriptions = await db
      .select()
      .from(businessSubscriptions)
      .where(eq(businessSubscriptions.businessId, businessId));

    if (subscriptions.length > 0) {
      exportData.tables.business_subscriptions = subscriptions;
      tablesIncluded.push('business_subscriptions');
      totalRecords += subscriptions.length;
    }

    // 4. Bookings (40%)
    await updateProgress(40);
    const bookingsRecords = await db
      .select()
      .from(bookings)
      .where(eq(bookings.businessId, businessId));

    if (bookingsRecords.length > 0) {
      exportData.tables.bookings = bookingsRecords;
      tablesIncluded.push('bookings');
      totalRecords += bookingsRecords.length;
    }

    // 5. Business directory (50%)
    await updateProgress(50);
    const directory = await db
      .select()
      .from(businessDirectory)
      .where(eq(businessDirectory.businessId, businessId));

    if (directory.length > 0) {
      exportData.tables.business_directory = directory;
      tablesIncluded.push('business_directory');
      totalRecords += directory.length;
    }

    // 6. Business settings (60%)
    await updateProgress(60);
    const settings = await db
      .select()
      .from(businessSettings)
      .where(eq(businessSettings.businessId, businessId));

    if (settings.length > 0) {
      exportData.tables.business_settings = settings;
      tablesIncluded.push('business_settings');
      totalRecords += settings.length;
    }

    // 7. Customer favorites (70%)
    await updateProgress(70);
    const favorites = await db
      .select()
      .from(customerFavorites)
      .where(eq(customerFavorites.businessId, businessId));

    if (favorites.length > 0) {
      exportData.tables.customer_favorites = favorites;
      tablesIncluded.push('customer_favorites');
      totalRecords += favorites.length;
    }

    // TODO: Add other industry-specific tables
    // - salonServices, salonStaff, salonAppointments (if salon)
    // - restaurantMenuItems, restaurantTables, restaurantReservations (if restaurant)
    // - businessReviews, advertisements, etc.

    // Write to file (80%)
    await updateProgress(80);
    const exportsDir = path.join(__dirname, '..', '..', 'exports');

    // Ensure exports directory exists
    if (!fs.existsSync(exportsDir)) {
      fs.mkdirSync(exportsDir, { recursive: true });
    }

    const filename = `export_${businessId}_${Date.now()}.json`;
    const filepath = path.join(exportsDir, filename);

    fs.writeFileSync(filepath, JSON.stringify(exportData, null, 2));

    const fileSizeBytes = fs.statSync(filepath).size;

    // Generate download URL (in production, use pre-signed S3 URL)
    const downloadUrl = `/api/exports/download/${filename}`;
    const downloadExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    // Update export record (100%)
    await updateProgress(100);
    await db
      .update(tenantDataExports)
      .set({
        status: 'completed',
        progressPercent: 100,
        filePath: filepath,
        fileSizeBytes,
        downloadUrl,
        downloadExpiresAt,
        tablesIncluded: tablesIncluded as any,
        recordsExported: totalRecords,
        completedAt: new Date(),
      })
      .where(eq(tenantDataExports.id, exportId));

  } catch (error: any) {
    // Log failure
    console.error('Data export processing error:', error);
    await db
      .update(tenantDataExports)
      .set({
        status: 'failed',
        errorMessage: error.message,
        completedAt: new Date(),
      })
      .where(eq(tenantDataExports.id, exportId));
  }
}

/**
 * List all exports for a business
 */
export async function listExports(businessId: number) {
  return db
    .select({
      id: tenantDataExports.id,
      exportType: tenantDataExports.exportType,
      exportFormat: tenantDataExports.exportFormat,
      status: tenantDataExports.status,
      progressPercent: tenantDataExports.progressPercent,
      fileSizeBytes: tenantDataExports.fileSizeBytes,
      downloadUrl: tenantDataExports.downloadUrl,
      downloadExpiresAt: tenantDataExports.downloadExpiresAt,
      recordsExported: tenantDataExports.recordsExported,
      startedAt: tenantDataExports.startedAt,
      completedAt: tenantDataExports.completedAt,
      createdAt: tenantDataExports.createdAt,
    })
    .from(tenantDataExports)
    .where(eq(tenantDataExports.businessId, businessId))
    .orderBy(tenantDataExports.createdAt);
}

/**
 * Get export status by ID
 */
export async function getExportStatus(exportId: number, businessId: number) {
  const [exportRecord] = await db
    .select()
    .from(tenantDataExports)
    .where(
      eq(tenantDataExports.id, exportId)
    )
    .limit(1);

  // Verify ownership
  if (exportRecord && exportRecord.businessId !== businessId) {
    throw new Error('Export not found or access denied');
  }

  return exportRecord;
}

/**
 * Get file path for download
 */
export async function getExportFilePath(
  exportId: number,
  businessId: number
): Promise<string> {
  const exportRecord = await getExportStatus(exportId, businessId);

  if (!exportRecord) {
    throw new Error('Export not found');
  }

  if (exportRecord.status !== 'completed') {
    throw new Error('Export is not completed yet');
  }

  if (!exportRecord.filePath) {
    throw new Error('Export file not found');
  }

  // Check if download URL has expired
  if (exportRecord.downloadExpiresAt && new Date() > exportRecord.downloadExpiresAt) {
    throw new Error('Download URL has expired');
  }

  return exportRecord.filePath;
}

/**
 * Delete an export (cleanup old exports)
 */
export async function deleteExport(exportId: number, businessId: number): Promise<void> {
  const exportRecord = await getExportStatus(exportId, businessId);

  if (!exportRecord) {
    throw new Error('Export not found');
  }

  // Delete file from disk
  if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
    fs.unlinkSync(exportRecord.filePath);
  }

  // Delete database record
  await db
    .delete(tenantDataExports)
    .where(eq(tenantDataExports.id, exportId));
}

/**
 * Cleanup expired exports (should be run as cron job)
 */
export async function cleanupExpiredExports(): Promise<number> {
  const now = new Date();

  // Get all exports where download has expired
  const expiredExports = await db
    .select()
    .from(tenantDataExports)
    .where(eq(tenantDataExports.status, 'completed'));

  let deletedCount = 0;

  for (const exportRecord of expiredExports) {
    if (exportRecord.downloadExpiresAt && now > exportRecord.downloadExpiresAt) {
      try {
        // Delete file
        if (exportRecord.filePath && fs.existsSync(exportRecord.filePath)) {
          fs.unlinkSync(exportRecord.filePath);
        }

        // Delete record
        await db
          .delete(tenantDataExports)
          .where(eq(tenantDataExports.id, exportRecord.id));

        deletedCount++;
      } catch (error) {
        console.error(`Failed to cleanup export ${exportRecord.id}:`, error);
      }
    }
  }

  return deletedCount;
}
