const Product = require('../models/Product');

async function listProductsForStorefront() {
  const productsList = await Product.find({ status: 'public' }).lean();
  
  return { dairy: productsList, source: 'database' };
}

module.exports = { listProductsForStorefront };
