/**
 * Restores "original" storefront images by mapping known products to local `/images/...` paths.
 * This is helpful if you previously used hardcoded frontend images and want DB products to use them.
 *
 * Run: npm run products:restore-images
 *
 * Notes:
 * - Only updates products that match by name keywords.
 * - Replaces `images` array with mapped local images (keeps `image` legacy field unchanged in DB).
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');

function matchKey(name) {
  const n = String(name || '').toLowerCase();
  if (n.includes('ghee')) return 'ghee';
  if (n.includes('aata') || n.includes('atta') || n.includes('flour') || n.includes('wheat')) return 'aata';
  if (n.includes('honey')) return 'honey';
  if (n.includes('mustard') || n.includes('oil')) return 'mustard';
  if (n.includes('gur') || n.includes('jaggery')) return 'gur';
  return null;
}

const imageMap = {
  ghee: ['/images/gheemain.jpeg', '/images/ghee2.jpeg', '/images/ghee3.jpeg', '/images/ghee4.jpeg'],
  aata: ['/images/aatamain.jpeg', '/images/aata2.jpeg', '/images/aata3.jpeg', '/images/atta4.jpeg'],
  // Only 3 unique honey images currently exist in `frontend/public/images`
  honey: ['/images/honeymain.jpeg', '/images/honeymain1.jpeg', '/images/honey2.jpeg'],
  mustard: ['/images/mus2.jpeg', '/images/mus1.jpeg', '/images/mus2.jpeg', '/images/mus3.jpeg'],
  gur: ['/images/gurmain.jpeg', '/images/gurr2.jpeg', '/images/gurr3.jpeg', '/images/gurr4.jpeg'],
};

async function restore() {
  await connectDB();
  const products = await Product.find({});
  let updated = 0;

  for (const p of products) {
    const key = matchKey(p.name);
    if (!key) continue;
    p.images = imageMap[key];
    await p.save();
    updated += 1;
  }

  console.log(`[restore-images] Updated ${updated} product(s)`);
}

if (require.main === module) {
  restore()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[restore-images]', e);
      process.exit(1);
    });
}

module.exports = { restore };

