/**
 * Idempotent admin user seeder.
 *
 * Required env:
 *   ADMIN_EMAIL, ADMIN_PASSWORD
 *
 * Optional:
 *   ADMIN_NAME (default "Admin")
 *   ADMIN_PHONE, ADMIN_ADDRESS
 *   ADMIN_SEED_DRY_RUN=1 — log actions only, no DB writes
 *
 * Run: npm run seed:admin
 */

require('dotenv').config();
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User');

const SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);

function readConfig() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = (process.env.ADMIN_NAME || 'Admin').trim();
  const phone = (process.env.ADMIN_PHONE || '').trim();
  const address = (process.env.ADMIN_ADDRESS || '').trim();
  const dryRun = ['1', 'true', 'yes'].includes(String(process.env.ADMIN_SEED_DRY_RUN || '').toLowerCase());

  if (!email || !password) {
    const err = new Error(
      'Missing ADMIN_EMAIL or ADMIN_PASSWORD. Set them in .env or the environment, then run: npm run seed:admin'
    );
    err.code = 'ADMIN_SEED_CONFIG';
    throw err;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (password.length < 6) {
    const err = new Error('ADMIN_PASSWORD must be at least 6 characters');
    err.code = 'ADMIN_SEED_CONFIG';
    throw err;
  }

  return { email: normalizedEmail, password, name, phone, address, dryRun };
}

/**
 * Creates or updates the admin user. Safe to run multiple times.
 * @returns {Promise<{ action: 'created' | 'updated' | 'dry-run', email: string }>}
 */
async function seedAdmin() {
  const { email, password, name, phone, address, dryRun } = readConfig();

  await connectDB();

  const existing = await User.findOne({ email });

  if (dryRun) {
    console.log('[admin-seeder] DRY RUN — no changes written');
    console.log(`[admin-seeder] Would ${existing ? 'update' : 'create'} admin: ${email}`);
    return { action: 'dry-run', email };
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  if (existing) {
    existing.role = 'admin';
    existing.password = hashedPassword;
    existing.name = name;
    if (process.env.ADMIN_PHONE != null && String(process.env.ADMIN_PHONE).trim() !== '') {
      existing.phone = phone;
    }
    if (process.env.ADMIN_ADDRESS != null && String(process.env.ADMIN_ADDRESS).trim() !== '') {
      existing.address = address;
    }
    await existing.save();
    console.log(`[admin-seeder] Updated admin user: ${email}`);
    return { action: 'updated', email };
  }

  await User.create({
    name,
    email,
    password: hashedPassword,
    role: 'admin',
    phone: phone || '',
    address: address || '',
  });
  console.log(`[admin-seeder] Created admin user: ${email}`);
  return { action: 'created', email };
}

async function run() {
  const result = await seedAdmin();
  return result;
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((error) => {
      if (error.code === 'ADMIN_SEED_CONFIG') {
        console.error(error.message);
      } else {
        console.error('[admin-seeder]', error);
      }
      process.exit(1);
    });
}

module.exports = { seedAdmin, run };
