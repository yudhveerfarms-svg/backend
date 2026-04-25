/**
 * Audits product images:
 *  - missing images[]
 *  - /images/* paths that don't exist in frontend/public/images
 *  - /uploads/* paths that don't exist in backend/uploads
 *
 * Run: node scripts/auditProductImages.js
 */
require('dotenv').config();
const path = require('path');
const fs = require('fs');
const connectDB = require('../config/db');
const Product = require('../models/Product');

function exists(p) {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

async function run() {
  await connectDB();

  const products = await Product.find({}).lean();
  const frontendImagesDir = path.join(__dirname, '..', '..', 'frontend', 'public', 'images');
  const backendUploadsDir = path.join(__dirname, '..', 'uploads');

  const missingImages = [];
  const brokenLocal = [];
  const brokenUploads = [];

  for (const p of products) {
    const imgs = Array.isArray(p.images) ? p.images.filter(Boolean) : [];
    if (imgs.length === 0) {
      missingImages.push({ id: String(p._id), name: p.name, sku: p.sku, legacyImage: p.image || null });
      continue;
    }

    for (const img of imgs) {
      if (img.startsWith('/images/')) {
        const file = img.replace('/images/', '');
        const full = path.join(frontendImagesDir, file);
        if (!exists(full)) brokenLocal.push({ product: p.name, sku: p.sku, img, expected: full });
      } else if (img.startsWith('/uploads/')) {
        const rel = img.replace('/uploads/', '');
        const full = path.join(backendUploadsDir, rel);
        if (!exists(full)) brokenUploads.push({ product: p.name, sku: p.sku, img, expected: full });
      }
    }
  }

  console.log('[audit] totals', {
    products: products.length,
    missingImages: missingImages.length,
    brokenLocal: brokenLocal.length,
    brokenUploads: brokenUploads.length,
  });

  if (missingImages.length) console.log('[audit] missing images examples', missingImages.slice(0, 10));
  if (brokenLocal.length) console.log('[audit] broken /images examples', brokenLocal.slice(0, 10));
  if (brokenUploads.length) console.log('[audit] broken /uploads examples', brokenUploads.slice(0, 10));
}

run().catch((e) => {
  console.error('[audit]', e);
  process.exit(1);
});

