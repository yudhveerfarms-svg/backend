const { asyncHandler } = require('../utils/asyncHandler');
const { sendSuccess, sendCreated } = require('../utils/response');
const { AppError } = require('../utils/AppError');
const { productBaseSchema, productUpdateSchema } = require('../validators/product.schemas');
const productAdminService = require('../services/product.admin.service');

function parseJsonField(value, fallback) {
  if (value == null || value === '') return fallback;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    throw new AppError('Invalid JSON field in multipart request', 400);
  }
}

function uploadedPaths(req) {
  const files = Array.isArray(req.files) ? req.files : [];
  return files.map((f) => `/uploads/products/${f.filename}`);
}

const list = asyncHandler(async (req, res) => {
  const q = String(req.query.q || '');
  const status = String(req.query.status || '');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 20);
  const data = await productAdminService.listAdminProducts({ q, status, page, limit });
  return sendSuccess(res, data);
});

const getOne = asyncHandler(async (req, res) => {
  const data = await productAdminService.getAdminProduct(req.params.productId);
  return sendSuccess(res, data);
});

const create = asyncHandler(async (req, res) => {
  const isMultipart = req.is('multipart/form-data');
  const raw = isMultipart ? req.body : req.body;
  const payload = {
    ...raw,
    price: raw.price,
    discount: raw.discount,
    images: isMultipart ? parseJsonField(raw.images, []) : raw.images,
    variants: isMultipart ? parseJsonField(raw.variants, []) : raw.variants,
  };
  const parsed = productBaseSchema.parse(payload);
  const data = await productAdminService.createAdminProduct(parsed, uploadedPaths(req));
  return sendCreated(res, data, 'Product created');
});

const update = asyncHandler(async (req, res) => {
  const isMultipart = req.is('multipart/form-data');
  const raw = isMultipart ? req.body : req.body;
  const payload = {
    ...raw,
    price: raw.price,
    discount: raw.discount,
    images: raw.images != null ? (isMultipart ? parseJsonField(raw.images, undefined) : raw.images) : undefined,
    variants: raw.variants != null ? (isMultipart ? parseJsonField(raw.variants, undefined) : raw.variants) : undefined,
  };
  const parsed = productUpdateSchema.parse(payload);
  const data = await productAdminService.updateAdminProduct(req.params.productId, parsed, uploadedPaths(req));
  return sendSuccess(res, data, { message: 'Product updated' });
});

const remove = asyncHandler(async (req, res) => {
  await productAdminService.deleteAdminProduct(req.params.productId);
  return sendSuccess(res, {}, { message: 'Product deleted' });
});

module.exports = { list, getOne, create, update, remove };

