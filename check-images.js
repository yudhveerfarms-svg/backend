const mongoose = require('mongoose');
require('dotenv').config();

async function checkProductImages() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farms');
    console.log('Connected to MongoDB');
    
    const Product = require('./models/Product');
    const products = await Product.find({}, 'name images image').limit(5);
    
    console.log('=== Product Images in Database ===');
    products.forEach(product => {
      console.log('Product:', product.name);
      console.log('Images array:', product.images);
      console.log('Virtual image field:', product.image);
      console.log('---');
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkProductImages();
