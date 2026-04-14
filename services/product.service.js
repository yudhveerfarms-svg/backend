const Product = require('../models/Product');
const { defaultProducts } = require('../constants/defaultProducts');

async function listProductsForStorefront() {
  const productsList = await Product.find({ status: 'public' }).lean();
  if (!productsList || productsList.length === 0) {
    return { dairy: defaultProducts, source: 'fallback' };
  }
  return { dairy: productsList, source: 'database' };
}

module.exports = { listProductsForStorefront };
