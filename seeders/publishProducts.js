/**
 * Sets all products to status=public (useful for initial migration).
 * Run: npm run products:publish-all
 */
require('dotenv').config();
const connectDB = require('../config/db');
const Product = require('../models/Product');

async function publishAll() {
  await connectDB();
  const res = await Product.updateMany({}, { $set: { status: 'public' } });
  console.log(`[publish-products] Matched ${res.matchedCount || res.n} / Modified ${res.modifiedCount || res.nModified}`);
}

if (require.main === module) {
  publishAll()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error('[publish-products]', e);
      process.exit(1);
    });
}

module.exports = { publishAll };

