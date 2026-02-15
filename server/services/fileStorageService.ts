import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Tenant-Aware File Storage Service
 * Ensures complete file isolation per tenant
 * Supports: products, documents, invoices, KYC, avatars
 */

export type FileCategory =
  | 'products'
  | 'documents'
  | 'invoices'
  | 'kyc'
  | 'avatars'
  | 'logos'
  | 'gallery'
  | 'temp';

export type StorageProvider = 'local' | 's3' | 'azure' | 'gcs';

export interface FileUploadOptions {
  tenantId: number;
  category: FileCategory;
  filename: string;
  buffer: Buffer;
  mimetype: string;
  metadata?: Record<string, any>;
}

export interface FileMetadata {
  tenantId: number;
  category: FileCategory;
  filename: string;
  originalFilename: string;
  path: string;
  url: string;
  size: number;
  mimetype: string;
  uploadedAt: Date;
  metadata?: Record<string, any>;
}

/**
 * Get storage base path
 */
function getStorageBasePath(): string {
  return process.env.STORAGE_PATH || path.join(__dirname, '..', '..', 'storage');
}

/**
 * Generate tenant-scoped file path
 * Format: /storage/tenants/{tenantId}/{category}/{filename}
 */
export function getTenantFilePath(
  tenantId: number,
  category: FileCategory,
  filename: string
): string {
  return path.join(
    getStorageBasePath(),
    'tenants',
    tenantId.toString(),
    category,
    filename
  );
}

/**
 * Generate secure random filename
 */
function generateSecureFilename(originalFilename: string): string {
  const ext = path.extname(originalFilename);
  const randomName = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  return `${timestamp}-${randomName}${ext}`;
}

/**
 * Ensure directory exists
 */
function ensureDirectoryExists(dirPath: string): void {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Upload file with tenant isolation
 */
export async function uploadFile(options: FileUploadOptions): Promise<FileMetadata> {
  const { tenantId, category, buffer, mimetype, metadata } = options;

  // Generate secure filename
  const secureFilename = generateSecureFilename(options.filename);

  // Get full file path
  const filePath = getTenantFilePath(tenantId, category, secureFilename);

  // Ensure tenant directory exists
  const dirPath = path.dirname(filePath);
  ensureDirectoryExists(dirPath);

  // Write file to disk
  fs.writeFileSync(filePath, buffer);

  // Generate public URL
  const publicUrl = `/storage/tenants/${tenantId}/${category}/${secureFilename}`;

  return {
    tenantId,
    category,
    filename: secureFilename,
    originalFilename: options.filename,
    path: filePath,
    url: publicUrl,
    size: buffer.length,
    mimetype,
    uploadedAt: new Date(),
    metadata,
  };
}

/**
 * Delete file with tenant verification
 */
export async function deleteFile(
  tenantId: number,
  category: FileCategory,
  filename: string
): Promise<boolean> {
  const filePath = getTenantFilePath(tenantId, category, filename);

  // Verify file belongs to tenant (path must contain tenantId)
  if (!filePath.includes(`/tenants/${tenantId}/`)) {
    throw new Error('File does not belong to this tenant');
  }

  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
    return true;
  }

  return false;
}

/**
 * Get file with tenant verification
 */
export async function getFile(
  tenantId: number,
  category: FileCategory,
  filename: string
): Promise<Buffer | null> {
  const filePath = getTenantFilePath(tenantId, category, filename);

  // Verify file belongs to tenant
  if (!filePath.includes(`/tenants/${tenantId}/`)) {
    throw new Error('File does not belong to this tenant');
  }

  if (fs.existsSync(filePath)) {
    return fs.readFileSync(filePath);
  }

  return null;
}

/**
 * List files for tenant
 */
export async function listFiles(
  tenantId: number,
  category: FileCategory
): Promise<string[]> {
  const dirPath = path.join(
    getStorageBasePath(),
    'tenants',
    tenantId.toString(),
    category
  );

  if (!fs.existsSync(dirPath)) {
    return [];
  }

  return fs.readdirSync(dirPath);
}

/**
 * Get total storage used by tenant (in bytes)
 */
export async function getTenantStorageUsage(tenantId: number): Promise<number> {
  const tenantPath = path.join(
    getStorageBasePath(),
    'tenants',
    tenantId.toString()
  );

  if (!fs.existsSync(tenantPath)) {
    return 0;
  }

  let totalSize = 0;

  function calculateDirSize(dirPath: string): void {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        calculateDirSize(filePath);
      } else {
        totalSize += stats.size;
      }
    }
  }

  calculateDirSize(tenantPath);

  return totalSize;
}

/**
 * Delete all files for a tenant (GDPR deletion)
 */
export async function deleteAllTenantFiles(tenantId: number): Promise<number> {
  const tenantPath = path.join(
    getStorageBasePath(),
    'tenants',
    tenantId.toString()
  );

  if (!fs.existsSync(tenantPath)) {
    return 0;
  }

  let deletedCount = 0;

  function deleteRecursive(dirPath: string): void {
    const files = fs.readdirSync(dirPath);

    for (const file of files) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        deleteRecursive(filePath);
        fs.rmdirSync(filePath);
      } else {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }
  }

  deleteRecursive(tenantPath);
  fs.rmdirSync(tenantPath);

  return deletedCount;
}

/**
 * Move tenant files to archive (before deletion)
 */
export async function archiveTenantFiles(tenantId: number): Promise<string> {
  const tenantPath = path.join(
    getStorageBasePath(),
    'tenants',
    tenantId.toString()
  );

  if (!fs.existsSync(tenantPath)) {
    throw new Error('Tenant files not found');
  }

  const archivePath = path.join(
    getStorageBasePath(),
    'archives',
    `tenant_${tenantId}_${Date.now()}`
  );

  ensureDirectoryExists(path.dirname(archivePath));

  // Move entire tenant directory to archive
  fs.renameSync(tenantPath, archivePath);

  return archivePath;
}

/**
 * Check if tenant is within storage quota
 */
export async function checkStorageQuota(
  tenantId: number,
  quotaGb: number
): Promise<{ withinQuota: boolean; usedGb: number; quotaGb: number }> {
  const usedBytes = await getTenantStorageUsage(tenantId);
  const usedGb = usedBytes / (1024 * 1024 * 1024);

  return {
    withinQuota: usedGb <= quotaGb,
    usedGb: Math.round(usedGb * 100) / 100,
    quotaGb,
  };
}

/**
 * S3 Storage Provider (for future implementation)
 */
export class S3StorageProvider {
  // TODO: Implement S3 with tenant isolation
  // Path format: s3://bucket-name/tenants/{tenantId}/{category}/{filename}

  async uploadFile(options: FileUploadOptions): Promise<FileMetadata> {
    throw new Error('S3 provider not implemented yet');
  }

  async deleteFile(tenantId: number, category: FileCategory, filename: string): Promise<boolean> {
    throw new Error('S3 provider not implemented yet');
  }

  async getFile(tenantId: number, category: FileCategory, filename: string): Promise<Buffer | null> {
    throw new Error('S3 provider not implemented yet');
  }
}

/**
 * Express middleware to serve tenant files with access control
 */
export function serveTenantFile() {
  return async (req: any, res: any) => {
    try {
      // Extract tenant ID and file path from URL
      // Format: /storage/tenants/:tenantId/:category/:filename
      const { tenantId, category, filename } = req.params;

      // Verify tenant access
      const requestTenantId = req.apiAuth?.businessId || req.domainTenant?.businessId || req.businessId;

      if (!requestTenantId || parseInt(tenantId) !== requestTenantId) {
        // Check if file is in public category
        if (category !== 'products' && category !== 'gallery' && category !== 'logos') {
          return res.status(403).json({ error: 'Access denied to tenant files' });
        }
      }

      // Get file
      const buffer = await getFile(parseInt(tenantId), category as FileCategory, filename);

      if (!buffer) {
        return res.status(404).json({ error: 'File not found' });
      }

      // Detect content type
      const ext = path.extname(filename).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.pdf': 'application/pdf',
        '.doc': 'application/msword',
        '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      };

      const contentType = mimeTypes[ext] || 'application/octet-stream';

      res.setHeader('Content-Type', contentType);
      res.send(buffer);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  };
}

/**
 * Example Usage:
 *
 * // 1. Upload product image
 * const fileMetadata = await uploadFile({
 *   tenantId: 123,
 *   category: 'products',
 *   filename: 'product.jpg',
 *   buffer: imageBuffer,
 *   mimetype: 'image/jpeg',
 *   metadata: { productId: 456 },
 * });
 *
 * // 2. Delete KYC document
 * await deleteFile(123, 'kyc', 'document.pdf');
 *
 * // 3. Get storage usage
 * const usedBytes = await getTenantStorageUsage(123);
 *
 * // 4. Check quota
 * const { withinQuota, usedGb } = await checkStorageQuota(123, 5);
 *
 * // 5. GDPR deletion
 * await deleteAllTenantFiles(123);
 *
 * // 6. Archive before deletion
 * const archivePath = await archiveTenantFiles(123);
 */
