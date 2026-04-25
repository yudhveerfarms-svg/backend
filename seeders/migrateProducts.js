/**
 * Backfill existing products created before the new product system.
 *
 * - category: from legacy `type` or "General"
 * - images: from legacy `image` if `images` empty
 * - status: set to "public" if missing
 * - sku: generated if missing (unique-ish)
 *
 * Run: npm run migrate:products
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Product = require('../models/Product');

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 32);
}

async function migrateProducts() {
  await connectDB();

  const products = await Product.find({});
  let updated = 0;

  for (const p of products) {
    let dirty = false;
    const legacy = p._doc || {};
    const legacyType = legacy.type;
    const legacyImage = legacy.image;
    const hasPersistedStatus = legacy.status != null;

    if (!p.category && (legacyType || legacy.category === undefined)) {
      p.category = String(legacyType || 'General').trim() || 'General';
      dirty = true;
    }

    if ((!Array.isArray(p.images) || p.images.length === 0) && legacyImage) {
      p.images = [String(legacyImage)];
      dirty = true;
    }

    if (!hasPersistedStatus) {
      p.status = 'public';
      dirty = true;
    }

    if (!p.sku) {
      const base = slugify(p.name) || 'product';
      const suffix = String(p._id).slice(-6).toUpperCase();
      p.sku = `${base}-${suffix}`;
      dirty = true;
    }

    if (dirty) {
      await p.save();
      updated += 1;
    }
  }

  console.log(`[migrate-products] Updated ${updated} product(s)`);
}

async function run() {
  await migrateProducts();
  await mongoose.disconnect();
}

if (require.main === module) {
  run()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[migrate-products]', e);
      process.exit(1);
    });
}

module.exports = { migrateProducts, run };

