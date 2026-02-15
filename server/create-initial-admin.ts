/**
 * Script to create the initial admin user
 * Run with: npx tsx server/create-initial-admin.ts
 */

import { createInitialAdmin } from './middleware/adminAuth.js';
import dotenv from 'dotenv';

dotenv.config();

async function main() {
  const username = process.env.INITIAL_ADMIN_USERNAME || 'admin';
  const password = process.env.INITIAL_ADMIN_PASSWORD || 'ChangeMe123!';
  const email = process.env.INITIAL_ADMIN_EMAIL || 'admin@desibazaar.local';

  console.log('🔐 Creating initial admin user...');
  console.log(`Username: ${username}`);
  console.log(`Email: ${email}`);

  if (password === 'ChangeMe123!') {
    console.warn('⚠️  WARNING: Using default password! Set INITIAL_ADMIN_PASSWORD in .env');
  }

  try {
    await createInitialAdmin(username, password, email);
    console.log('✅ Admin user created successfully!');
    console.log('\n📝 Login credentials:');
    console.log(`   Username: ${username}`);
    console.log(`   Password: ${password === 'ChangeMe123!' ? '(default - please change!)' : '(from .env)'}`);
    console.log('\n🌐 Login at: http://localhost:5173/admin/login');
  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    process.exit(1);
  }

  process.exit(0);
}

main();
