const mongoose = require('mongoose');
require('dotenv').config();

async function checkOrderData() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/farms');
    console.log('Connected to MongoDB');
    
    const Order = require('./models/Order');
    const Product = require('./models/Product');
    const orders = await Order.find({ paymentStatus: 'paid' })
      .populate('items.product', 'name images image weight')
      .limit(2);
    
    console.log('=== Order Data Structure ===');
    orders.forEach(order => {
      console.log('Order Number:', order.orderNumber);
      console.log('Items:');
      order.items.forEach((item, index) => {
        console.log(`  Item ${index + 1}:`);
        console.log(`    Name: ${item.name}`);
        console.log(`    selectedSize: ${item.selectedSize || 'NOT FOUND'}`);
        console.log(`    Product weight: ${item.product?.weight || 'NOT FOUND'}`);
        console.log(`    Product images: ${item.product?.images?.length || 0} images`);
        console.log(`    Product image: ${item.product?.image || 'NOT FOUND'}`);
        console.log(`    Price: ${item.price}`);
        console.log(`    Quantity: ${item.quantity}`);
        console.log('---');
      });
      console.log('\n');
    });
    
    await mongoose.connection.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

checkOrderData();
