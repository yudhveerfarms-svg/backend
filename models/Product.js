const mongoose = require('mongoose');

const variantSchema = mongoose.Schema(
  {
    size: { type: String, required: true, trim: true, maxlength: 120 },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, required: true, min: 0, default: 0 },
    sku: { type: String, default: '', trim: true, maxlength: 80 },
  },
  { _id: false }
);

const productSchema = mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 200, index: true },
    description: { type: String, required: true, trim: true, maxlength: 8000 },

    category: { type: String, required: true, trim: true, maxlength: 120, index: true },

    /**
     * Base price (for simple products or as a fallback when no variant selected).
     * Your storefront will primarily use variants.
     */
    price: { type: Number, required: true, min: 0, default: 0 },

    discount: { type: Number, default: 0, min: 0, max: 100 },

    sku: { type: String, required: true, unique: true, trim: true, maxlength: 80, index: true },

    status: { type: String, enum: ['public', 'draft'], default: 'draft', index: true },

    images: { type: [String], default: [] },

    variants: { type: [variantSchema], default: [] },
  },
  {
    timestamps: true,
  }
);

productSchema.virtual('image').get(function image() {
  return Array.isArray(this.images) && this.images.length ? this.images[0] : '';
});

productSchema.virtual('type').get(function type() {
  return this.category || '';
});

productSchema.virtual('weight').get(function weight() {
  if (Array.isArray(this.variants) && this.variants.length) {
    return this.variants.map((v) => v.size).join(', ');
  }
  return '';
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
