import { drizzle } from "drizzle-orm/node-postgres";
import { Client } from "pg";
import { businesses } from "../db/schema";
import { eq } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL || "postgresql://postgres:postgres@localhost:9100/desibazaar";
const client = new Client({ connectionString });
await client.connect();
const db = drizzle(client);

function generateSlug(name, id) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .trim()
    .replace(/^-+|-+$/g, '') // Remove leading/trailing hyphens
    + '-' + id; // Add ID to ensure uniqueness
}

async function migrateBusinessSlugs() {
  try {
    console.log('Starting business slug migration...');
    
    // First, add the slug column if it doesn't exist
    try {
      await sql`ALTER TABLE businesses ADD COLUMN IF NOT EXISTS slug TEXT`;
      await sql`CREATE UNIQUE INDEX IF NOT EXISTS businesses_slug_idx ON businesses(slug)`;
      console.log('Added slug column and index');
    } catch (error) {
      console.log('Column might already exist:', error.message);
    }

    // Get all businesses without slugs
    const businessList = await db
      .select({ id: businesses.id, name: businesses.name, slug: businesses.slug })
      .from(businesses);

    console.log(`Found ${businessList.length} businesses to process`);

    for (const business of businessList) {
      if (!business.slug) {
        const slug = generateSlug(business.name, business.id);
        await db
          .update(businesses)
          .set({ slug })
          .where(eq(businesses.id, business.id));
        
        console.log(`Generated slug "${slug}" for business "${business.name}"`);
      } else {
        console.log(`Business "${business.name}" already has slug: ${business.slug}`);
      }
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrateBusinessSlugs();