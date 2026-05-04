const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductVariants() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farms');
    console.log('Connected to MongoDB');
    
    const Product = require('./models/Product');
    const products = await Product.find({}, 'name variants').limit(5);
    
    console.log('=== Product Variants ===');
    products.forEach(product => {
      console.log('Product:', product.name);
      console.log('Variants:', product.variants);
      console.log('---');
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkProductVariants();
