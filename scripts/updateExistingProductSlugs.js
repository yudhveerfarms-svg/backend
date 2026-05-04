/**
 * Script to update existing products with SEO-friendly slugs
 * Run this script once to add slugs to all existing products
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const { slugify, generateUniqueSlug } = require('../utils/slugify');

require('dotenv').config();

async function updateProductSlugs() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farms');
    console.log('Connected to MongoDB');

    // Find all products without slugs
    const productsWithoutSlug = await Product.find({ slug: { $exists: false } });
    console.log(`Found ${productsWithoutSlug.length} products without slugs`);

    for (const product of productsWithoutSlug) {
      try {
        // Generate unique slug
        const baseSlug = slugify(product.name);
        const slug = await generateUniqueSlug(baseSlug, async (slug) => {
          const existing = await Product.findOne({ slug, _id: { $ne: product._id } }).lean();
          return !!existing;
        });

        // Update product with slug
        await Product.updateOne(
          { _id: product._id },
          { $set: { slug } }
        );

        console.log(`Updated product "${product.name}" with slug: "${slug}"`);
      } catch (error) {
        console.error(`Error updating product ${product._id}:`, error.message);
      }
    }

    console.log('Slug update completed successfully');
    
  } catch (error) {
    console.error('Script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateProductSlugs();
