const Product = require('../models/Product');
const { AppError } = require('../utils/AppError');
const { slugify, generateUniqueSlug } = require('../utils/slugify');

function normalizeImages(images) {
  const list = Array.isArray(images) ? images : [];
  const cleaned = list.map((x) => String(x || '').trim()).filter(Boolean);
  // de-dup while preserving order
  return [...new Set(cleaned)];
}

function normalizeVariants(variants) {
  const list = Array.isArray(variants) ? variants : [];
  const cleaned = list
    .map((v) => ({
      size: String(v.size || '').trim(),
      price: Number(v.price) || 0,
      stock: Math.max(0, Number(v.stock) || 0),
      sku: String(v.sku || '').trim(),
    }))
    .filter((v) => v.size);
  return cleaned;
}

function computeFallbackPrice(product) {
  if (typeof product.price === 'number' && product.price > 0) return product.price;
  if (Array.isArray(product.variants) && product.variants.length) {
    return Math.min(...product.variants.map((v) => Number(v.price) || 0).filter((p) => p > 0));
  }
  return 0;
}

async function listAdminProducts({ q = '', status = '', page = 1, limit = 20 } = {}) {
  const clauses = [];
  if (q) {
    const rx = new RegExp(String(q).trim().replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&'), 'i');
    clauses.push({ $or: [{ name: rx }, { sku: rx }, { category: rx }] });
  }
  if (status) clauses.push({ status });
  const filter = clauses.length ? { $and: clauses } : {};

  const pageNum = Math.max(1, Number(page) || 1);
  const limitNum = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (pageNum - 1) * limitNum;

  const [items, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
    Product.countDocuments(filter),
  ]);

  return { products: items, page: pageNum, limit: limitNum, total, pages: Math.ceil(total / limitNum) || 1 };
}

async function getAdminProduct(productId) {
  const product = await Product.findById(productId).lean();
  if (!product) throw new AppError('Product not found', 404);
  return product;
}

async function createAdminProduct(payload, uploadedImagePaths = []) {
  const images = normalizeImages([...(payload.images || []), ...uploadedImagePaths]);
  const variants = normalizeVariants(payload.variants);
  
  // Generate slug from product name
  const baseSlug = slugify(payload.name);
  const slug = await generateUniqueSlug(baseSlug, async (slug) => {
    const existing = await Product.findOne({ slug }).lean();
    return !!existing;
  });
  
  const product = await Product.create({
    name: payload.name,
    description: payload.description,
    category: payload.category,
    sku: payload.sku,
    slug: slug,
    status: payload.status || 'draft',
    price: payload.price ?? 0,
    discount: payload.discount ?? 0,
    images,
    variants,
  });

  // Ensure a sane base price for legacy parts (checkout fallback)
  if (!product.price || product.price <= 0) {
    const fallback = computeFallbackPrice(product);
    if (fallback > 0) {
      product.price = fallback;
      await product.save();
    }
  }

  return product.toObject();
}

async function updateAdminProduct(productId, updates, uploadedImagePaths = []) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);

  if (updates.name != null) {
    product.name = updates.name;
    // Regenerate slug if name changed
    const baseSlug = slugify(updates.name);
    const slug = await generateUniqueSlug(baseSlug, async (slug) => {
      const existing = await Product.findOne({ slug, _id: { $ne: product._id } }).lean();
      return !!existing;
    });
    product.slug = slug;
  }
  if (updates.description != null) product.description = updates.description;
  if (updates.category != null) product.category = updates.category;
  if (updates.sku != null) product.sku = updates.sku;
  if (updates.status != null) product.status = updates.status;
  if (updates.price != null) product.price = updates.price;
  if (updates.discount != null) product.discount = updates.discount;

  // Only update images if explicitly provided or new files uploaded
  if (updates.images !== undefined || uploadedImagePaths.length) {
    const nextImages = normalizeImages([...(updates.images !== undefined ? updates.images : product.images || []), ...uploadedImagePaths]);
    product.images = nextImages;
  }

  // Only update variants if explicitly provided
  if (updates.variants !== undefined) {
    product.variants = normalizeVariants(updates.variants);
  }

  if (!product.price || product.price <= 0) {
    const fallback = computeFallbackPrice(product);
    if (fallback > 0) product.price = fallback;
  }

  await product.save();
  return product.toObject();
}

async function deleteAdminProduct(productId) {
  const product = await Product.findById(productId);
  if (!product) throw new AppError('Product not found', 404);
  await product.deleteOne();
}

module.exports = {
  listAdminProducts,
  getAdminProduct,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
};

