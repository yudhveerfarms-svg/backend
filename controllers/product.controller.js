const { asyncHandler } = require('../utils/asyncHandler');
const productService = require('../services/product.service');

/** Legacy shape `{ dairy }` — storefront expects root `dairy` (not wrapped in `data`). */
const listProducts = asyncHandler(async (req, res) => {
  const { dairy, source } = await productService.listProductsForStorefront();
  res.set('X-Product-Source', source);
  return res.status(200).json({ dairy });
});

module.exports = { listProducts };
