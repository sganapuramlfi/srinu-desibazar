import { db } from '../../db/index.js';
import { tenantDomains, businessTenants } from '../../db/index.js';
import { eq, and } from 'drizzle-orm';
import crypto from 'crypto';
import dns from 'dns';
import { promisify } from 'util';

const resolveTxt = promisify(dns.resolveTxt);

/**
 * Create subdomain for tenant (auto-verified)
 * Format: {business-slug}.desibazaar.com
 */
export async function createSubdomain(
  businessId: number,
  subdomain?: string
): Promise<{ domainValue: string; isPrimary: boolean }> {
  // Get business details
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  // Use provided subdomain or business slug
  const subdomainName = subdomain || business.slug;

  // Validate subdomain format (lowercase letters, numbers, hyphens)
  if (!/^[a-z0-9-]+$/.test(subdomainName)) {
    throw new Error('Invalid subdomain format. Use lowercase letters, numbers, and hyphens only.');
  }

  const domainValue = `${subdomainName}.desibazaar.com`;

  // Check if domain already exists
  const existingDomain = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.domainValue, domainValue))
    .limit(1);

  if (existingDomain.length > 0) {
    throw new Error('Subdomain already exists');
  }

  // Check if this is the first domain (make it primary)
  const existingDomains = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.businessId, businessId));

  const isPrimary = existingDomains.length === 0;

  // Create subdomain record
  await db.insert(tenantDomains).values({
    businessId,
    domainType: 'subdomain',
    domainValue,
    isVerified: true, // Subdomains are auto-verified
    sslStatus: 'active',
    isPrimary,
    isActive: true,
    activatedAt: new Date(),
  });

  return { domainValue, isPrimary };
}

/**
 * Add custom domain for tenant (Enterprise feature)
 * Requires DNS verification before activation
 */
export async function addCustomDomain(
  businessId: number,
  domain: string
): Promise<{
  domainValue: string;
  verificationToken: string;
  dnsRecords: {
    type: string;
    name: string;
    value: string;
    ttl: number;
  };
}> {
  // Validate domain format
  const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
  if (!domainRegex.test(domain)) {
    throw new Error('Invalid domain format');
  }

  // Check if domain already exists
  const existingDomain = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.domainValue, domain))
    .limit(1);

  if (existingDomain.length > 0) {
    throw new Error('Domain already registered');
  }

  // Check if business has custom domain enabled
  const [business] = await db
    .select()
    .from(businessTenants)
    .where(eq(businessTenants.id, businessId))
    .limit(1);

  if (!business) {
    throw new Error('Business not found');
  }

  if (!business.customDomainEnabled) {
    throw new Error('Custom domains not enabled for this business. Upgrade to Enterprise plan.');
  }

  // Generate verification token
  const verificationToken = crypto.randomBytes(32).toString('hex');

  // DNS records needed for verification
  const dnsRecords = {
    type: 'TXT',
    name: `_desibazaar-verification.${domain}`,
    value: verificationToken,
    ttl: 300,
  };

  // Create custom domain record (unverified)
  await db.insert(tenantDomains).values({
    businessId,
    domainType: 'custom',
    domainValue: domain,
    isVerified: false,
    verificationToken,
    sslStatus: 'pending',
    dnsRecords: dnsRecords as any,
    isPrimary: false,
    isActive: false,
  });

  return {
    domainValue: domain,
    verificationToken,
    dnsRecords,
  };
}

/**
 * Verify domain ownership via DNS TXT record
 */
export async function verifyDomain(domainId: number, businessId: number): Promise<boolean> {
  // Get domain record
  const [domainRecord] = await db
    .select()
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.id, domainId),
        eq(tenantDomains.businessId, businessId)
      )
    )
    .limit(1);

  if (!domainRecord) {
    throw new Error('Domain not found');
  }

  if (domainRecord.isVerified) {
    return true; // Already verified
  }

  if (domainRecord.domainType === 'subdomain') {
    // Subdomains are auto-verified
    return true;
  }

  // Verify DNS TXT record
  const txtName = `_desibazaar-verification.${domainRecord.domainValue}`;

  try {
    const txtRecords = await resolveTxt(txtName);

    // Check if any TXT record contains our verification token
    const verified = txtRecords.some((record) => {
      const value = Array.isArray(record) ? record.join('') : record;
      return value === domainRecord.verificationToken;
    });

    if (verified) {
      // Update domain as verified
      await db
        .update(tenantDomains)
        .set({
          isVerified: true,
          isActive: true,
          activatedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(tenantDomains.id, domainId));

      return true;
    } else {
      throw new Error('Verification token not found in DNS records');
    }
  } catch (error: any) {
    console.error('DNS verification error:', error);
    throw new Error(`DNS verification failed: ${error.message}`);
  }
}

/**
 * Get tenant by domain (for domain-based routing)
 */
export async function getTenantByDomain(domain: string): Promise<number | null> {
  const [tenantDomain] = await db
    .select()
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.domainValue, domain),
        eq(tenantDomains.isActive, true),
        eq(tenantDomains.isVerified, true)
      )
    )
    .limit(1);

  return tenantDomain?.businessId || null;
}

/**
 * List all domains for a business
 */
export async function listDomains(businessId: number) {
  return db
    .select({
      id: tenantDomains.id,
      domainType: tenantDomains.domainType,
      domainValue: tenantDomains.domainValue,
      isVerified: tenantDomains.isVerified,
      verificationToken: tenantDomains.verificationToken,
      sslStatus: tenantDomains.sslStatus,
      dnsRecords: tenantDomains.dnsRecords,
      isPrimary: tenantDomains.isPrimary,
      isActive: tenantDomains.isActive,
      activatedAt: tenantDomains.activatedAt,
      createdAt: tenantDomains.createdAt,
    })
    .from(tenantDomains)
    .where(eq(tenantDomains.businessId, businessId))
    .orderBy(tenantDomains.createdAt);
}

/**
 * Set primary domain for a business
 */
export async function setPrimaryDomain(domainId: number, businessId: number): Promise<void> {
  // Get domain record
  const [domainRecord] = await db
    .select()
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.id, domainId),
        eq(tenantDomains.businessId, businessId)
      )
    )
    .limit(1);

  if (!domainRecord) {
    throw new Error('Domain not found');
  }

  if (!domainRecord.isVerified || !domainRecord.isActive) {
    throw new Error('Domain must be verified and active to set as primary');
  }

  // Remove primary flag from all other domains
  await db
    .update(tenantDomains)
    .set({ isPrimary: false })
    .where(eq(tenantDomains.businessId, businessId));

  // Set this domain as primary
  await db
    .update(tenantDomains)
    .set({ isPrimary: true, updatedAt: new Date() })
    .where(eq(tenantDomains.id, domainId));
}

/**
 * Remove domain from business
 */
export async function removeDomain(domainId: number, businessId: number): Promise<void> {
  // Get domain record
  const [domainRecord] = await db
    .select()
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.id, domainId),
        eq(tenantDomains.businessId, businessId)
      )
    )
    .limit(1);

  if (!domainRecord) {
    throw new Error('Domain not found');
  }

  if (domainRecord.isPrimary) {
    throw new Error('Cannot remove primary domain. Set another domain as primary first.');
  }

  // Delete domain
  await db
    .delete(tenantDomains)
    .where(eq(tenantDomains.id, domainId));
}

/**
 * Update SSL status for domain (called by SSL management service)
 */
export async function updateSSLStatus(
  domainId: number,
  status: 'pending' | 'active' | 'failed'
): Promise<void> {
  await db
    .update(tenantDomains)
    .set({ sslStatus: status, updatedAt: new Date() })
    .where(eq(tenantDomains.id, domainId));
}

/**
 * Get primary domain for business
 */
export async function getPrimaryDomain(businessId: number): Promise<string | null> {
  const [domain] = await db
    .select({ domainValue: tenantDomains.domainValue })
    .from(tenantDomains)
    .where(
      and(
        eq(tenantDomains.businessId, businessId),
        eq(tenantDomains.isPrimary, true),
        eq(tenantDomains.isActive, true)
      )
    )
    .limit(1);

  return domain?.domainValue || null;
}

/**
 * Check if subdomain is available
 */
export async function isSubdomainAvailable(subdomain: string): Promise<boolean> {
  const domainValue = `${subdomain}.desibazaar.com`;

  const existing = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.domainValue, domainValue))
    .limit(1);

  return existing.length === 0;
}

/**
 * Check if custom domain is available
 */
export async function isCustomDomainAvailable(domain: string): Promise<boolean> {
  const existing = await db
    .select()
    .from(tenantDomains)
    .where(eq(tenantDomains.domainValue, domain))
    .limit(1);

  return existing.length === 0;
}
