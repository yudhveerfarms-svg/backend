const express = require('express');
const router = express.Router();
const {
  getInvoice,
  downloadInvoice,
  getInvoiceData,
  generateInvoiceNumber,
  adminGenerateInvoiceNumber,
  adminGetOrdersForInvoices,
  adminGetGSTSummary
} = require('../controllers/invoice.controller');
const { optionalAuth, authRequired } = require('../middleware/auth');

// Get invoice as HTML (view in browser)
router.get('/view/:orderId', optionalAuth, getInvoice);

// Download invoice (currently as HTML, can be extended to PDF)
router.get('/download/:orderId', optionalAuth, downloadInvoice);

// Get invoice data as JSON (for API usage)
router.get('/data/:orderId', optionalAuth, getInvoiceData);

// Generate invoice number for an order
router.post('/generate-number/:orderId', optionalAuth, generateInvoiceNumber);

// Admin-only routes
router.post('/admin/generate-number/:orderId', authRequired, adminGenerateInvoiceNumber);
router.post('/admin/orders-for-invoices', authRequired, adminGetOrdersForInvoices);
router.get('/admin/gst-summary', authRequired, adminGetGSTSummary);

module.exports = router;
