const { generateInvoiceData, generateInvoiceHTML } = require('../services/invoice.service');
const { generateInvoicePDF } = require('../services/pdf.service');
const Order = require('../models/Order');
const { AppError } = require('../utils/AppError');
const { authRequired } = require('../middleware/auth');

/**
 * Generate and display invoice for an order
 */
async function getInvoice(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    // Generate invoice data
    const invoiceData = await generateInvoiceData(orderId);
    
    // Generate HTML invoice
    const invoiceHTML = generateInvoiceHTML(invoiceData);
    
    // Set headers for HTML response
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="invoice-${invoiceData.invoiceDetails.invoiceNumber}.html"`);
    
    res.send(invoiceHTML);
  } catch (error) {
    console.error('Error generating invoice:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to generate invoice' });
    }
  }
}

/**
 * Generate and download invoice as PDF
 */
async function downloadInvoice(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    // Generate invoice data
    const invoiceData = await generateInvoiceData(orderId);
    
    // Generate PDF buffer
    const pdfBuffer = await generateInvoicePDF(invoiceData);
    
    // Set headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoiceData.invoiceDetails.invoiceNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading invoice PDF:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ error: 'Order not found' });
    } else {
      res.status(500).json({ error: 'Failed to generate PDF invoice' });
    }
  }
}

/**
 * Get invoice data as JSON (for API usage)
 */
async function getInvoiceData(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    const invoiceData = await generateInvoiceData(orderId);
    
    res.json({
      success: true,
      data: invoiceData
    });
  } catch (error) {
    console.error('Error fetching invoice data:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ success: false, error: 'Order not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to fetch invoice data' });
    }
  }
}

/**
 * Generate invoice number for an order (if not already generated)
 */
async function generateInvoiceNumber(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${order.orderNumber}-${Date.now()}`;
      await order.save();
    }

    res.json({
      success: true,
      data: {
        invoiceNumber: order.invoiceNumber,
        orderNumber: order.orderNumber
      }
    });
  } catch (error) {
    console.error('Error generating invoice number:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ success: false, error: 'Order not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to generate invoice number' });
    }
  }
}

/**
 * Admin: Generate invoice number for an order
 */
async function adminGenerateInvoiceNumber(req, res) {
  try {
    const { orderId } = req.params;
    
    if (!orderId) {
      throw new AppError('Order ID is required', 400);
    }

    const order = await Order.findById(orderId);
    
    if (!order) {
      throw new AppError('Order not found', 404);
    }

    // Generate invoice number if not exists
    if (!order.invoiceNumber) {
      order.invoiceNumber = `INV-${order.orderNumber}-${Date.now()}`;
      await order.save();
    }

    res.json({
      success: true,
      data: {
        invoiceNumber: order.invoiceNumber,
        orderNumber: order.orderNumber,
        orderId: order._id
      }
    });
  } catch (error) {
    console.error('Error generating admin invoice number:', error);
    if (error.message === 'Order not found') {
      res.status(404).json({ success: false, error: 'Order not found' });
    } else {
      res.status(500).json({ success: false, error: 'Failed to generate invoice number' });
    }
  }
}

/**
 * Admin: Get multiple orders for bulk invoice operations
 */
async function adminGetOrdersForInvoices(req, res) {
  try {
    const { orderIds } = req.body;
    
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      throw new AppError('Order IDs are required', 400);
    }

    const orders = await Order.find({ 
      _id: { $in: orderIds },
      paymentStatus: 'paid'
    }).populate('items.product', 'name');

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Error fetching orders for invoices:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch orders' });
  }
}

/**
 * Admin: Get GST summary for orders
 */
async function adminGetGSTSummary(req, res) {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) dateFilter.createdAt.$gte = new Date(startDate);
      if (endDate) dateFilter.createdAt.$lte = new Date(endDate);
    }

    const orders = await Order.find({
      ...dateFilter,
      paymentStatus: 'paid',
      totalGST: { $gt: 0 }
    });

    // Calculate GST summary
    const summary = {
      totalOrders: orders.length,
      totalSubtotal: orders.reduce((sum, order) => sum + order.subtotal, 0),
      totalCGST: orders.reduce((sum, order) => sum + (order.cgst || 0), 0),
      totalSGST: orders.reduce((sum, order) => sum + (order.sgst || 0), 0),
      totalIGST: orders.reduce((sum, order) => sum + (order.igst || 0), 0),
      totalGST: orders.reduce((sum, order) => sum + order.totalGST, 0),
      intraStateOrders: orders.filter(order => !order.isInterState).length,
      interStateOrders: orders.filter(order => order.isInterState).length,
      ordersByState: {}
    };

    // Group orders by state
    orders.forEach(order => {
      const state = order.customer?.state || 'Unknown';
      if (!summary.ordersByState[state]) {
        summary.ordersByState[state] = {
          count: 0,
          totalGST: 0,
          totalAmount: 0
        };
      }
      summary.ordersByState[state].count++;
      summary.ordersByState[state].totalGST += order.totalGST;
      summary.ordersByState[state].totalAmount += order.totalPrice;
    });

    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Error generating GST summary:', error);
    res.status(500).json({ success: false, error: 'Failed to generate GST summary' });
  }
}

module.exports = {
  getInvoice,
  downloadInvoice,
  getInvoiceData,
  generateInvoiceNumber,
  adminGenerateInvoiceNumber,
  adminGetOrdersForInvoices,
  adminGetGSTSummary
};
