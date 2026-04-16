const Product = require('../models/Product');
const { defaultProducts } = require('../constants/defaultProducts');

async function listProductsForStorefront() {
  const productsList = await Product.find({ status: 'public' }).lean();
  let finalProducts = [];

  if (!productsList || productsList.length === 0) {
    finalProducts = [...defaultProducts];
  } else {
    finalProducts = [...productsList];
    // To ensure the flow is the exact same for all 5 baseline products (like Gurr),
    // we inject missing baseline products seamlessly if the DB is only partially seeded.
    for (const dp of defaultProducts) {
      const dbMatch = finalProducts.some(p => {
        const dName = (p.name || '').toLowerCase();
        const ref = dp.name.toLowerCase();
        if (ref.includes('gur') || ref.includes('jaggery')) return dName.includes('gur') || dName.includes('jaggery');
        if (ref.includes('ghee')) return dName.includes('ghee');
        if (ref.includes('aata') || ref.includes('wheat')) return dName.includes('aata') || dName.includes('wheat');
        if (ref.includes('honey')) return dName.includes('honey');
        if (ref.includes('mustard') || ref.includes('oil')) return dName.includes('mustard') || dName.includes('oil');
        return dName === ref;
      });
      if (!dbMatch) {
        finalProducts.push(dp);
      }
    }
  }

  // Sort to maintain standard catalog order, ensuring Gurr appears exactly at the end.
  finalProducts.sort((a, b) => {
    const getOrder = (name) => {
      const n = (name || '').toLowerCase();
      if (n.includes('ghee')) return 1;
      if (n.includes('aata') || n.includes('wheat')) return 2;
      if (n.includes('honey')) return 3;
      if (n.includes('mustard') || n.includes('oil')) return 4;
      if (n.includes('gur') || n.includes('jaggery')) return 5;
      return 6;
    };
    return getOrder(a.name) - getOrder(b.name);
  });

  return { dairy: finalProducts, source: productsList && productsList.length > 0 ? 'database_with_fallback' : 'fallback' };
}

module.exports = { listProductsForStorefront };
