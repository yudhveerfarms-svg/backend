const { sendOrderConfirmationEmail } = require('./email.service');
const Order = require('../models/Order');

/**
 * Test email functionality by sending a test order confirmation email
 * This function can be called manually to test email setup
 */
async function testOrderEmail(orderId) {
  try {
    console.log('Testing order confirmation email...');
    
    // Find a test order or create a mock order
    let order;
    if (orderId) {
      order = await Order.findById(orderId).populate('items.product', 'name');
    } else {
      // Create a mock order for testing
      order = {
        _id: 'test-order-id',
        orderNumber: 'TEST-123456',
        createdAt: new Date(),
        paymentStatus: 'paid',
        subtotal: 1000,
        totalPrice: 1180,
        totalGST: 180,
        gstRate: 18,
        cgst: 90,
        sgst: 90,
        customer: {
          name: 'Test Customer',
          email: 'test@example.com',
          phone: '+919876543210',
          address: '123 Test Street',
          city: 'Test City',
          state: 'Punjab',
          pincode: '141001'
        },
        items: [
          {
            name: 'Fresh Ghee',
            selectedSize: '1kg',
            quantity: 2,
            price: 500,
            lineTotal: 1000
          }
        ]
      };
    }

    if (!order) {
      throw new Error('Order not found for testing');
    }

    // Send test email
    await sendOrderConfirmationEmail(order, 'test@example.com');
    
    console.log('✅ Test email sent successfully!');
    console.log(`📧 Order: ${order.orderNumber}`);
    console.log(`👤 Customer: ${order.customer.name}`);
    console.log(`📧 Email: ${order.customer.email}`);
    
    return { success: true, message: 'Test email sent successfully' };
    
  } catch (error) {
    console.error('❌ Test email failed:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Quick test to check email configuration
 */
async function testEmailConfig() {
  try {
    console.log('Testing email configuration...');
    
    // Check environment variables
    const requiredEnvVars = ['EMAIL_USER', 'EMAIL_PASS'];
    const missing = requiredEnvVars.filter(env => !process.env[env]);
    
    if (missing.length > 0) {
      throw new Error(`Missing environment variables: ${missing.join(', ')}`);
    }
    
    console.log('✅ Email configuration looks good!');
    console.log(`📧 Email User: ${process.env.EMAIL_USER}`);
    console.log(`🔗 SMTP Host: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
    console.log(`🔌 SMTP Port: ${process.env.SMTP_PORT || 587}`);
    
    return { success: true, message: 'Email configuration is valid' };
    
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  testOrderEmail,
  testEmailConfig
};
