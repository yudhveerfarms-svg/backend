const mongoose = require('mongoose');
const Product = require('../models/Product');

// MongoDB connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/farms';

async function updateProductPrices() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Get all products
    const products = await Product.find({});
    console.log(`Found ${products.length} products to update`);

    let updatedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      
      // Update main product price (reduce by 5% for GST-inclusive pricing)
      if (product.price && product.price > 0) {
        const originalPrice = product.price;
        const gstInclusivePrice = Math.round((originalPrice / 1.05) * 100) / 100;
        
        if (gstInclusivePrice !== originalPrice) {
          product.price = gstInclusivePrice;
          needsUpdate = true;
          console.log(`Product: ${product.name}`);
          console.log(`  Original: ₹${originalPrice}`);
          console.log(`  GST-Inclusive: ₹${gstInclusivePrice}`);
        }
      }

      // Update variant prices
      if (product.variants && Array.isArray(product.variants)) {
        product.variants.forEach((variant, index) => {
          if (variant.price && variant.price > 0) {
            const originalPrice = variant.price;
            const gstInclusivePrice = Math.round((originalPrice / 1.05) * 100) / 100;
            
            if (gstInclusivePrice !== originalPrice) {
              product.variants[index].price = gstInclusivePrice;
              needsUpdate = true;
              console.log(`  Variant ${variant.size}: ₹${originalPrice} → ₹${gstInclusivePrice}`);
            }
          }
        });
      }

      // Save the product if it was updated
      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`✅ Updated: ${product.name}\n`);
      }
    }

    console.log(`\n✅ Successfully updated ${updatedCount} products to GST-inclusive pricing`);
    console.log('All prices are now inclusive of 5% GST');

  } catch (error) {
    console.error('Error updating product prices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

// Run the script
updateProductPrices();
