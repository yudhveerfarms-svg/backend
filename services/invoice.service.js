const Order = require('../models/Order');
const { formatGSTBreakdown } = require('./gst.service');

/**
 * Generate invoice data for an order with GST details
 * @param {string} orderId - Order ID
 * @returns {Object} Invoice data with GST breakdown
 */
async function generateInvoiceData(orderId) {
  const order = await Order.findById(orderId)
    .populate('items.product', 'name')
    .populate('user', 'name email phone');

  if (!order) {
    throw new Error('Order not found');
  }

  // Company information (you can update this with your actual company details)

  const companyInfo = {
    name: 'Yudhveer Farms',
    address: 'Fatuhiwala, Muktsar, Punjab, India 152113',
    phone: '+918559097003',
    email: 'yudhveerfarms@gmail.com',
    gstin: '03HQUPS7601J1Z7', // Add your actual GSTIN
    state: 'Punjab',
    stateCode: '03' // Punjab state code
  };

  // Customer billing information
  const billingInfo = {
    name: order.customer.name,
    address: order.customer.address,
    city: order.customer.city,
    state: order.customer.state,
    pincode: order.customer.pincode,
    phone: order.customer.phone,
    email: order.customer.email,
    gstin: order.customer.gstin || null // Optional customer GSTIN
  };

  // Invoice details - Generate invoice number if not exists
  let invoiceNumber = order.invoiceNumber;
  if (!invoiceNumber) {
    invoiceNumber = `INV-${order.orderNumber}-${Date.now()}`;
    // Update order with invoice number
    await Order.findByIdAndUpdate(order._id, { invoiceNumber });
  }

  const invoiceDetails = {
    invoiceNumber: invoiceNumber,
    orderNumber: order.orderNumber,
    invoiceDate: new Date().toLocaleDateString('en-IN'),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN'), // 30 days
    placeOfSupply: order.customer.state || 'Unknown',
    placeOfOrigin: companyInfo.state,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus
  };

  // Items with GST calculation
  const items = order.items.map(item => {
    const itemSubtotal = item.price * item.quantity;
    const gstRate = order.gstRate || 5;

    // Calculate GST per item proportionally
    const itemGST = (itemSubtotal / order.subtotal) * order.totalGST;
    const itemCGST = order.cgst > 0 ? (itemSubtotal / order.subtotal) * order.cgst : 0;
    const itemSGST = order.sgst > 0 ? (itemSubtotal / order.subtotal) * order.sgst : 0;
    const itemIGST = order.igst > 0 ? (itemSubtotal / order.subtotal) * order.igst : 0;

    // Extract variant information from the item
    let variant = '';
    if (item.selectedSize) {
      variant = item.selectedSize;
    } else if (item.product && item.product.variants && Array.isArray(item.product.variants) && item.product.variants.length > 0) {
      // If product has variants, show available sizes
      variant = item.product.variants.map(v => v.size).join(', ');
    } else {
      // For products without variants, don't show N/A
      variant = '';
    }

    return {
      productId: item.product._id,
      name: item.name,
      variant: variant,
      hsnCode: '0401',
      quantity: item.quantity,
      unit: 'PCS',
      unitPrice: item.price,
      subtotal: itemSubtotal,
      gstRate: gstRate,
      cgst: Math.round(itemCGST * 100) / 100,
      sgst: Math.round(itemSGST * 100) / 100,
      igst: Math.round(itemIGST * 100) / 100,
      totalGST: Math.round(itemGST * 100) / 100,
      total: itemSubtotal // ✅ GST excluded
    };
  });

  // GST Summary
  const gstSummary = {
    isInterState: order.isInterState,
    cgst: order.cgst,
    sgst: order.sgst,
    igst: order.igst,
    totalGST: order.totalGST,
    gstRate: order.gstRate,
    taxableAmount: order.subtotal,
    totalAmount: order.totalPrice
  };

  // Tax breakdown for display
  const taxBreakdown = formatGSTBreakdown(gstSummary);

  return {
    companyInfo,
    billingInfo,
    invoiceDetails,
    items,
    gstSummary,
    taxBreakdown,
    order: {
      id: order._id,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      status: order.orderStatus,
      fulfillmentStatus: order.fulfillmentStatus
    }
  };
}

/**
 * Generate invoice HTML template
 * @param {Object} invoiceData - Invoice data from generateInvoiceData
 * @returns {string} HTML invoice template
 */
function generateInvoiceHTML(invoiceData) {
  const { companyInfo, billingInfo, invoiceDetails, items, gstSummary, taxBreakdown } = invoiceData;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tax Invoice - ${invoiceDetails.invoiceNumber}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .invoice { max-width: 800px; width: 100%; margin: 0 auto; background: white; padding: 30px; border: 1px solid #ddd; box-sizing: border-box; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
        .company-row { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 20px; margin-bottom: 20px; }
        .company-info, .billing-info { flex: 1 1 280px; min-width: 0; }
        .company-info { text-align: left; }
        .billing-info { text-align: left; }
        .invoice-details { margin: 20px 0; padding: 15px; background: #f9f9f9; border: 1px solid #ddd; }
        .table-wrapper { width: 100%; overflow-x: auto; margin: 20px 0; }
        .items-table { width: 100%; min-width: 720px; border-collapse: collapse; }
        .items-table th, .items-table td { border: 1px solid #ddd; padding: 12px; text-align: left; font-size: 14px; }
        .items-table th { background: #f5f5f5; font-weight: bold; }
        .items-table .text-right { text-align: right; }
        .gst-summary { margin: 20px 0; padding: 15px; background: #f0f8ff; border: 1px solid #ddd; }
        .totals { margin-top: 20px; text-align: right; }
        .totals div { margin: 5px 0; }
        .totals .grand-total { font-size: 18px; font-weight: bold; border-top: 2px solid #333; padding-top: 10px; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
        .gst-info { background: #fff3cd; padding: 10px; border: 1px solid #ffeaa7; margin: 10px 0; font-size: 12px; }
        @media (max-width: 720px) {
            body { padding: 10px; }
            .invoice { padding: 20px; }
            .company-row { flex-direction: column; }
            .company-info, .billing-info { width: 100%; }
            .invoice-details { font-size: 14px; }
            .items-table th, .items-table td { padding: 10px; font-size: 12px; }
            .gst-summary, .gst-info, .totals, .footer { font-size: 13px; }
            .totals { text-align: left; }
            .totals .grand-total { text-align: left; }
            .header h1 { font-size: 22px; }
        }
    </style>
</head>
<body>
    <div class="invoice">
        <div class="header">
            <h1>TAX INVOICE</h1>
            <p>${companyInfo.name} | GSTIN: ${companyInfo.gstin}</p>
        </div>

        <div class="company-row">
           <div class="company-info">
          <strong>Billed By:</strong><br>
          <strong>${companyInfo.name}</strong><br>
          ${companyInfo.address}<br>
          Phone: ${companyInfo.phone}<br>
          Email: ${companyInfo.email}<br>
          GSTIN: ${companyInfo.gstin}<br>
          State: ${companyInfo.state} (${companyInfo.stateCode})
        </div>

            <div class="billing-info">
                <strong>Billed To:</strong><br>
                ${billingInfo.name}<br>
                ${billingInfo.address}<br>
                ${billingInfo.city}, ${billingInfo.state} - ${billingInfo.pincode}<br>
                Phone: ${billingInfo.phone}<br>
                ${billingInfo.email ? `Email: ${billingInfo.email}<br>` : ''}
                ${billingInfo.gstin ? `GSTIN: ${billingInfo.gstin}` : ''}
            </div>
        </div>

        <div class="invoice-details">
            <strong>Invoice Details:</strong><br>
            Invoice Number: ${invoiceDetails.invoiceNumber}<br>
            Order Number: ${invoiceDetails.orderNumber}<br>
            Invoice Date: ${invoiceDetails.invoiceDate}<br>
            Due Date: ${invoiceDetails.dueDate}<br>
            Place of Supply: ${invoiceDetails.placeOfSupply}<br>
            Place of Origin: ${invoiceDetails.placeOfOrigin}<br>
            Payment Method: ${invoiceDetails.paymentMethod}<br>
            Payment Status: ${invoiceDetails.paymentStatus}
        </div>

        <div class="table-wrapper">
        <table class="items-table">
            <thead>
                <tr>
                    <th>Item Description</th>
                    <th>HSN Code</th>
                    <th>Qty</th>
                    <th>Unit Price</th>
                    <th>Subtotal</th>
                    <th>GST Rate</th>
                    <th>CGST</th>
                    <th>SGST</th>
                    <th>IGST</th>
                    <th class="text-right">Total</th>
                </tr>
            </thead>
            <tbody>
                ${items.map(item => `
                <tr>
                    <td>${item.name}${item.variant ? ` (${item.variant})` : ''}</td>
                    <td>${item.hsnCode}</td>
                    <td>${item.quantity}</td>
                    <td class="text-right">₹${item.unitPrice.toFixed(2)}</td>
                    <td class="text-right">₹${item.subtotal.toFixed(2)}</td>
                    <td>${item.gstRate}%</td>
                    <td class="text-right">₹${item.cgst.toFixed(2)}</td>
                    <td class="text-right">₹${item.sgst.toFixed(2)}</td>
                    <td class="text-right">₹${item.igst.toFixed(2)}</td>
                    <td class="text-right">₹${item.total.toFixed(2)}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        </div>

        <div class="gst-summary">
            <strong>GST Summary:</strong><br>
            ${gstSummary.isInterState ?
      `IGST (${gstSummary.gstRate}%): ₹${gstSummary.igst.toFixed(2)}` :
      `CGST (${gstSummary.gstRate / 2}%): ₹${gstSummary.cgst.toFixed(2)}<br>
                 SGST (${gstSummary.gstRate / 2}%): ₹${gstSummary.sgst.toFixed(2)}`
    }<br>
            Total GST: ₹${gstSummary.totalGST.toFixed(2)}<br>
            Taxable Amount: ₹${gstSummary.taxableAmount.toFixed(2)}<br>
            Total Amount: ₹${gstSummary.totalAmount.toFixed(2)}
        </div>

        <div class="gst-info">
            <strong>GST Information:</strong><br>
            • This invoice is ${gstSummary.isInterState ? 'inter-state (IGST applicable)' : 'intra-state (CGST + SGST applicable)'}<br>
            • HSN Code: 0401 (Dairy Products)<br>
            • GST Rate: ${gstSummary.gstRate}% as per applicable tax laws<br>
            • Reverse Charge: Not Applicable
        </div>

        <div class="totals">
            <div>Subtotal: ₹${gstSummary.taxableAmount.toFixed(2)}</div>
            <div>Total GST: ₹${gstSummary.totalGST.toFixed(2)}</div>
            <div class="grand-total">Grand Total: ₹${gstSummary.totalAmount.toFixed(2)}</div>
        </div>

        <div class="footer">
            <p>This is a computer-generated invoice and does not require a signature.</p>
            <p>Thank you for your business! For any queries, please contact us at ${companyInfo.email}</p>
        </div>
    </div>
</body>
</html>
  `;
}

module.exports = {
  generateInvoiceData,
  generateInvoiceHTML
};
