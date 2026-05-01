const nodemailer = require('nodemailer');
const { AppError } = require('../utils/AppError');

function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    throw new AppError('Email service is not configured', 503, { code: 'EMAIL_CONFIG' });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

async function sendContactEmail({ name, email, message }) {
  const transporter = createTransporter();
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeMessage = escapeHtml(message);

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.RECEIVER_EMAIL || process.env.EMAIL_USER,
    subject: `New Contact Form Submission from ${name}`,
    html: `
  <div style="background:#f4f6f8;padding:40px;font-family:Arial,sans-serif">
    <table width="600" align="center" style="background:white;padding:30px;border-radius:8px">

      <tr>
        <td style="background:#1f2937;color:white;padding:15px;text-align:center">
          <h2 style="margin:0;">Yudhveer Farms</h2>
          <p style="margin:0;color:#f97316">New Contact Form Submission</p>
        </td>
      </tr>

      <tr>
        <td style="padding-top:20px;font-size:15px;color:#333">
          <p><b>Name:</b> ${safeName}</p>
          <p><b>Email:</b> ${safeEmail}</p>
          <p><b>Message:</b></p>
          <div style="background:#f9fafb;padding:15px;border-radius:5px;white-space:pre-wrap">${safeMessage}</div>
        </td>
      </tr>

      <tr>
        <td style="text-align:center;padding-top:20px">
          <a href="mailto:${safeEmail}"
          style="background:#f97316;color:white;padding:10px 18px;text-decoration:none;border-radius:5px">
          Reply
          </a>
        </td>
      </tr>

    </table>
  </div>
  `,
  };

  await transporter.sendMail(mailOptions);
}

async function sendOrderConfirmationEmail(order, customerEmail, invoicePdfBuffer = null) {
  const transporter = createTransporter();
  
  if (!customerEmail) {
    throw new AppError('Customer email is required for order confirmation', 400);
  }

  const items = order.items || [];
  const customer = order.customer || {};
  
  // Generate invoice PDF if not provided
  let pdfAttachment = invoicePdfBuffer;
  if (!pdfAttachment) {
    const { generateInvoiceData } = require('./invoice.service');
    const { generateInvoicePDF } = require('./pdf.service');
    const invoiceData = await generateInvoiceData(order._id);
    pdfAttachment = await generateInvoicePDF(invoiceData);
  }

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: customerEmail,
    subject: `Order Confirmation - Yudhveer Farms - Order #${order.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Order Confirmation - Yudhveer Farms</title>
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; }
        .header { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); color: white; padding: 40px 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; }
        .content { padding: 40px 30px; }
        .thank-you { text-align: center; margin-bottom: 40px; }
        .thank-you h2 { color: #1f2937; font-size: 24px; margin-bottom: 10px; }
        .thank-you p { color: #6b7280; font-size: 16px; line-height: 1.5; }
        .order-info { background: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .order-info h3 { color: #374151; font-size: 18px; margin: 0 0 15px 0; }
        .order-info p { margin: 8px 0; color: #4b5563; }
        .order-info strong { color: #1f2937; }
        .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .items-table th { background: #f3f4f6; padding: 12px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; }
        .items-table td { padding: 15px 12px; border-bottom: 1px solid #f3f4f6; vertical-align: top; }
        .items-table .item-name { font-weight: 600; color: #1f2937; }
        .items-table .item-variant { color: #f97316; font-size: 14px; margin-top: 4px; }
        .items-table .text-right { text-align: right; }
        .total-section { background: #fef3c7; border: 2px solid #f59e0b; border-radius: 12px; padding: 20px; margin-bottom: 30px; }
        .total-section h3 { color: #92400e; margin: 0 0 15px 0; font-size: 18px; }
        .total-row { display: flex; justify-content: space-between; margin-bottom: 8px; color: #78350f; }
        .total-row.grand-total { font-size: 20px; font-weight: bold; color: #92400e; border-top: 2px solid #f59e0b; padding-top: 12px; margin-top: 12px; }
        .footer { background: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb; }
        .footer p { color: #6b7280; font-size: 14px; margin: 8px 0; }
        .footer a { color: #f97316; text-decoration: none; }
        .footer .social { margin-top: 20px; }
        .footer .social a { display: inline-block; margin: 0 8px; width: 36px; height: 36px; background: #f97316; color: white; border-radius: 50%; line-height: 36px; text-align: center; }
        .badge { display: inline-block; background: #dcfce7; color: #166534; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; margin-left: 8px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🌾 Yudhveer Farms</h1>
            <p>Pure · Natural · Organic</p>
        </div>
        
        <div class="content">
            <div class="thank-you">
                <h2>Thank You for Your Order! 🎉</h2>
                <p>Your order has been successfully confirmed and we're preparing it with care. We'll notify you once it's on its way.</p>
            </div>

            <div class="order-info">
                <h3>📋 Order Information</h3>
                <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><strong>Payment Status:</strong> <span class="badge">${order.paymentStatus === 'paid' ? 'Paid' : 'Pending'}</span></p>
                <p><strong>Delivery Address:</strong> ${customer.address}, ${customer.city}, ${customer.state} - ${customer.pincode}</p>
            </div>

            <h3 style="color: #374151; margin-bottom: 15px;">🛒 Your Products</h3>
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Product</th>
                        <th style="width: 100px;">Quantity</th>
                        <th style="width: 100px;">Unit Price</th>
                        <th style="width: 120px;" class="text-right">Total</th>
                    </tr>
                </thead>
                <tbody>
                    ${items.map(item => `
                        <tr>
                            <td>
                                <div class="item-name">${item.name}</div>
                                ${item.selectedSize ? `<div class="item-variant">${item.selectedSize}</div>` : ''}
                            </td>
                            <td>${item.quantity}</td>
                            <td>₹${Number(item.price || 0).toLocaleString('en-IN')}</td>
                            <td class="text-right">₹${Number(item.lineTotal || 0).toLocaleString('en-IN')}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>

            <div class="total-section">
                <h3>💰 Order Summary</h3>
                <div class="total-row">
                    <span>Subtotal:</span>
                    <span>₹${Number(order.subtotal || 0).toLocaleString('en-IN')}</span>
                </div>
                ${order.totalGST > 0 ? `
                    <div class="total-row">
                        <span>GST (${order.gstRate}%):</span>
                        <span>₹${Number(order.totalGST || 0).toLocaleString('en-IN')}</span>
                    </div>
                ` : ''}
                <div class="total-row grand-total">
                    <span>Total Amount:</span>
                    <span>₹${Number(order.totalPrice || 0).toLocaleString('en-IN')}</span>
                </div>
            </div>

            <div style="text-align: center; margin-bottom: 30px;">
                <p style="color: #6b7280; margin-bottom: 15px;">Need help? Contact our customer support:</p>
                <div style="display: flex; justify-content: center; gap: 15px;">
                    <a href="tel:+919876543210" style="background: #f97316; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        📞 Call Us
                    </a>
                    <a href="mailto:info@yudhveerfarms.com" style="background: #1f2937; color: white; padding: 10px 20px; text-decoration: none; border-radius: 8px; font-weight: 600;">
                        ✉️ Email Us
                    </a>
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Yudhveer Farms</strong></p>
            <p>Farm-fresh dairy, stone-ground staples, and cold-pressed oils</p>
            <p>📍 Punjab, India | 📞 +91 98765 43210 | ✉️ info@yudhveerfarms.com</p>
            <div class="social">
                <a href="#">📘</a>
                <a href="#">📷</a>
                <a href="#">🐦</a>
            </div>
            <p style="margin-top: 20px; font-size: 12px; color: #9ca3af;">
                This email was sent to ${customerEmail}. You received this email because you placed an order with Yudhveer Farms.
            </p>
        </div>
    </div>
</body>
</html>
    `,
    attachments: pdfAttachment ? [{
      filename: `invoice-${order.orderNumber}.pdf`,
      content: pdfAttachment,
      contentType: 'application/pdf'
    }] : []
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { 
  sendContactEmail,
  sendOrderConfirmationEmail
};
