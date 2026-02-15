import { db } from '../../db/index.js';
import {
  platformAnalytics,
  businessTenants,
  bookings,
  platformUsers,
  businessSubscriptions,
  subscriptionPlans,
} from '../../db/index.js';
import { eq, and, count, sql, sum, avg, gte, lte } from 'drizzle-orm';

/**
 * Main function to aggregate all analytics
 * Should be run daily at midnight
 */
export async function aggregateDailyAnalytics(date?: Date): Promise<void> {
  const targetDate = date || new Date();
  targetDate.setHours(0, 0, 0, 0);

  console.log(`Starting analytics aggregation for ${targetDate.toISOString().split('T')[0]}`);

  try {
    // Run all aggregations
    await aggregatePlatformMetrics(targetDate);
    await aggregateIndustryMetrics(targetDate);
    await aggregateTierMetrics(targetDate);
    await aggregateRegionMetrics(targetDate);

    console.log('Analytics aggregation completed successfully');
  } catch (error) {
    console.error('Analytics aggregation failed:', error);
    throw error;
  }
}

/**
 * Aggregate platform-wide metrics
 */
async function aggregatePlatformMetrics(date: Date): Promise<void> {
  console.log('Aggregating platform-wide metrics...');

  // Count total and active businesses
  const businessCounts = await db
    .select({
      total: count(),
      active: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`.as('active'),
      suspended: sql<number>`COUNT(*) FILTER (WHERE status = 'suspended')`.as('suspended'),
      closed: sql<number>`COUNT(*) FILTER (WHERE status = 'closed')`.as('closed'),
    })
    .from(businessTenants);

  // Count new signups today
  const newSignups = await db
    .select({ count: count() })
    .from(businessTenants)
    .where(
      and(
        gte(businessTenants.createdAt, date),
        lte(businessTenants.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Count churned businesses today (deleted)
  const churned = await db
    .select({ count: count() })
    .from(businessTenants)
    .where(
      and(
        eq(businessTenants.status, 'closed'),
        gte(businessTenants.deletedAt!, date),
        lte(businessTenants.deletedAt!, new Date(date.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Count total bookings
  const bookingMetrics = await db
    .select({
      total: count(),
      totalValue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
      avgValue: sql<number>`COALESCE(AVG(${bookings.totalPrice}), 0)`,
    })
    .from(bookings)
    .where(
      and(
        gte(bookings.createdAt, date),
        lte(bookings.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
      )
    );

  // Count total users
  const userCounts = await db
    .select({
      total: count(),
      activeToday: sql<number>`COUNT(*) FILTER (WHERE last_login >= ${date})`.as('active_today'),
    })
    .from(platformUsers);

  // Calculate MRR and ARR (from active subscriptions)
  const revenueMetrics = await db
    .select({
      mrr: sql<number>`
        COALESCE(SUM(
          CASE
            WHEN ${businessSubscriptions.billingCycle} = 'monthly' THEN ${subscriptionPlans.priceMonthly}
            WHEN ${businessSubscriptions.billingCycle} = 'yearly' THEN ${subscriptionPlans.priceYearly} / 12
            ELSE 0
          END
        ), 0)
      `,
      arr: sql<number>`
        COALESCE(SUM(
          CASE
            WHEN ${businessSubscriptions.billingCycle} = 'monthly' THEN ${subscriptionPlans.priceMonthly} * 12
            WHEN ${businessSubscriptions.billingCycle} = 'yearly' THEN ${subscriptionPlans.priceYearly}
            ELSE 0
          END
        ), 0)
      `,
    })
    .from(businessSubscriptions)
    .innerJoin(subscriptionPlans, eq(businessSubscriptions.planId, subscriptionPlans.id))
    .where(eq(businessSubscriptions.status, 'active'));

  // Calculate total storage used
  const storageMetrics = await db
    .select({
      totalStorage: sql<number>`COALESCE(SUM(${businessTenants.storageUsedGb}), 0)`,
    })
    .from(businessTenants);

  // Insert aggregated data
  await db.insert(platformAnalytics).values({
    date: date.toISOString().split('T')[0] as any,
    hour: null,
    aggregationLevel: 'platform',
    dimensionValue: 'all',
    totalBusinesses: businessCounts[0].total,
    activeBusinesses: businessCounts[0].active,
    newSignups: newSignups[0].count,
    churnedBusinesses: churned[0].count,
    totalBookings: bookingMetrics[0].total,
    totalBookingValue: bookingMetrics[0].totalValue.toString() as any,
    avgBookingValue: bookingMetrics[0].avgValue.toString() as any,
    totalUsers: userCounts[0].total,
    activeUsers: userCounts[0].activeToday,
    mrr: revenueMetrics[0]?.mrr?.toString() as any || '0',
    arr: revenueMetrics[0]?.arr?.toString() as any || '0',
    totalStorageGb: storageMetrics[0].totalStorage.toString() as any,
  });

  console.log('Platform metrics aggregated');
}

/**
 * Aggregate metrics by industry type
 */
async function aggregateIndustryMetrics(date: Date): Promise<void> {
  console.log('Aggregating industry-specific metrics...');

  const industries = ['salon', 'restaurant', 'event', 'realestate', 'retail', 'professional'];

  for (const industry of industries) {
    // Count businesses in this industry
    const businessCounts = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`.as('active'),
      })
      .from(businessTenants)
      .where(eq(businessTenants.industryType, industry as any));

    // Count bookings for this industry
    const bookingMetrics = await db
      .select({
        total: count(),
        totalValue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
        avgValue: sql<number>`COALESCE(AVG(${bookings.totalPrice}), 0)`,
      })
      .from(bookings)
      .innerJoin(businessTenants, eq(bookings.businessId, businessTenants.id))
      .where(
        and(
          eq(businessTenants.industryType, industry as any),
          gte(bookings.createdAt, date),
          lte(bookings.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        )
      );

    // Insert industry metrics
    await db.insert(platformAnalytics).values({
      date: date.toISOString().split('T')[0] as any,
      hour: null,
      aggregationLevel: 'industry',
      dimensionValue: industry,
      totalBusinesses: businessCounts[0].total,
      activeBusinesses: businessCounts[0].active,
      totalBookings: bookingMetrics[0].total,
      totalBookingValue: bookingMetrics[0].totalValue.toString() as any,
      avgBookingValue: bookingMetrics[0].avgValue.toString() as any,
    });
  }

  console.log('Industry metrics aggregated');
}

/**
 * Aggregate metrics by tenant tier
 */
async function aggregateTierMetrics(date: Date): Promise<void> {
  console.log('Aggregating tier-specific metrics...');

  const tiers = ['free', 'standard', 'professional', 'enterprise'];

  for (const tier of tiers) {
    // Count businesses in this tier
    const businessCounts = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`.as('active'),
      })
      .from(businessTenants)
      .where(eq(businessTenants.tenantTier, tier as any));

    // Count bookings for this tier
    const bookingMetrics = await db
      .select({
        total: count(),
        totalValue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
      })
      .from(bookings)
      .innerJoin(businessTenants, eq(bookings.businessId, businessTenants.id))
      .where(
        and(
          eq(businessTenants.tenantTier, tier as any),
          gte(bookings.createdAt, date),
          lte(bookings.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        )
      );

    // Calculate storage for this tier
    const storageMetrics = await db
      .select({
        totalStorage: sql<number>`COALESCE(SUM(${businessTenants.storageUsedGb}), 0)`,
      })
      .from(businessTenants)
      .where(eq(businessTenants.tenantTier, tier as any));

    // Insert tier metrics
    await db.insert(platformAnalytics).values({
      date: date.toISOString().split('T')[0] as any,
      hour: null,
      aggregationLevel: 'tier',
      dimensionValue: tier,
      totalBusinesses: businessCounts[0].total,
      activeBusinesses: businessCounts[0].active,
      totalBookings: bookingMetrics[0].total,
      totalBookingValue: bookingMetrics[0].totalValue.toString() as any,
      totalStorageGb: storageMetrics[0].totalStorage.toString() as any,
    });
  }

  console.log('Tier metrics aggregated');
}

/**
 * Aggregate metrics by region (data residency)
 */
async function aggregateRegionMetrics(date: Date): Promise<void> {
  console.log('Aggregating region-specific metrics...');

  const regions = ['au-sydney', 'us-east', 'eu-west', 'ap-southeast'];

  for (const region of regions) {
    // Count businesses in this region
    const businessCounts = await db
      .select({
        total: count(),
        active: sql<number>`COUNT(*) FILTER (WHERE status = 'active')`.as('active'),
      })
      .from(businessTenants)
      .where(eq(businessTenants.dataResidency, region as any));

    // Count bookings for this region
    const bookingMetrics = await db
      .select({
        total: count(),
        totalValue: sql<number>`COALESCE(SUM(${bookings.totalPrice}), 0)`,
      })
      .from(bookings)
      .innerJoin(businessTenants, eq(bookings.businessId, businessTenants.id))
      .where(
        and(
          eq(businessTenants.dataResidency, region as any),
          gte(bookings.createdAt, date),
          lte(bookings.createdAt, new Date(date.getTime() + 24 * 60 * 60 * 1000))
        )
      );

    // Insert region metrics
    await db.insert(platformAnalytics).values({
      date: date.toISOString().split('T')[0] as any,
      hour: null,
      aggregationLevel: 'region',
      dimensionValue: region,
      totalBusinesses: businessCounts[0].total,
      activeBusinesses: businessCounts[0].active,
      totalBookings: bookingMetrics[0].total,
      totalBookingValue: bookingMetrics[0].totalValue.toString() as any,
    });
  }

  console.log('Region metrics aggregated');
}

/**
 * Query analytics for admin dashboard
 */
export async function getAnalytics(params: {
  level: 'platform' | 'industry' | 'tier' | 'region';
  dimension?: string;
  startDate: Date;
  endDate: Date;
}) {
  let query = db
    .select()
    .from(platformAnalytics)
    .where(
      and(
        eq(platformAnalytics.aggregationLevel, params.level),
        gte(platformAnalytics.date, params.startDate.toISOString().split('T')[0] as any),
        lte(platformAnalytics.date, params.endDate.toISOString().split('T')[0] as any)
      )
    );

  if (params.dimension) {
    query = query.where(eq(platformAnalytics.dimensionValue, params.dimension)) as any;
  }

  return query.orderBy(platformAnalytics.date);
}

// For manual execution: node --loader tsx server/jobs/aggregateAnalytics.ts
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Running analytics aggregation manually...');
  aggregateDailyAnalytics()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Failed:', error);
      process.exit(1);
    });
}
