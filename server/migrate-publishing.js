import { Pool } from 'pg';

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@localhost:9100/desibazaar'
});

async function addPublishingColumns() {
  try {
    console.log('Adding publishing control columns...');
    
    // Add publishedSections column
    await pool.query(`
      ALTER TABLE business_tenants 
      ADD COLUMN IF NOT EXISTS published_sections JSONB DEFAULT '[]'::jsonb NOT NULL
    `);
    
    // Add storefrontSettings column
    await pool.query(`
      ALTER TABLE business_tenants 
      ADD COLUMN IF NOT EXISTS storefront_settings JSONB DEFAULT '{
        "showReviews": true,
        "showGallery": true,
        "showContactInfo": true,
        "showSocialMedia": true,
        "showOperatingHours": true,
        "theme": "default"
      }'::jsonb NOT NULL
    `);
    
    console.log('✅ Publishing columns added successfully');
    
    // Update sample business with default published sections
    await pool.query(`
      UPDATE business_tenants 
      SET published_sections = '["menu", "gallery", "reviews", "contact", "social"]'::jsonb
      WHERE slug = 'spice-palace-melbourne'
    `);
    
    console.log('✅ Sample business updated with published sections');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

addPublishingColumns();