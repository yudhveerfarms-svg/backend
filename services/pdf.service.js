const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

/**
 * Generate PDF invoice for an order
 * @param {Object} invoiceData - Invoice data from invoice service
 * @param {string} outputPath - Optional output path for the PDF
 * @returns {Buffer} PDF buffer
 */
async function generateInvoicePDF(invoiceData, outputPath = null) {
  const { companyInfo, billingInfo, invoiceDetails, items, gstSummary } = invoiceData;
  
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margins: {
          top: 40,
          bottom: 40,
          left: 40,
          right: 40
        }
      });

      // Register fonts
      doc.registerFont('Normal', 'Helvetica');
      doc.registerFont('Bold', 'Helvetica-Bold');
      doc.font('Normal');

      const buffers = [];
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(buffers);
        if (outputPath) {
          fs.writeFileSync(outputPath, pdfBuffer);
        }
        resolve(pdfBuffer);
      });

      // Helper function for formatting currency
      const formatINR = (amount) => {
        const num = Number(amount) || 0;
        return `Rs.${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      let currentY = 40; // Start position

      // Header Section
      doc.fontSize(24).fillColor('#2d3748').text('TAX INVOICE', 40, currentY, { align: 'center' });
      currentY += 30;
      
      doc.fontSize(16).fillColor('#4a5568').text(companyInfo.name, 40, currentY, { align: 'center' });
      currentY += 20;
      
      doc.fontSize(10).fillColor('#718096').text(`GSTIN: ${companyInfo.gstin} | ${companyInfo.state} (${companyInfo.stateCode})`, 40, currentY, { align: 'center' });
      currentY += 25;

      // Invoice Number and Date Box
      doc.rect(40, currentY, 530, 60).stroke();
      doc.fontSize(11).fillColor('#2d3748').text('Invoice Number:', 50, currentY + 10);
      doc.fontSize(12).font('Bold').text(invoiceDetails.invoiceNumber, 50, currentY + 30, { width: 150 });
      
      doc.fontSize(11).font('Normal').text('Order Number:', 220, currentY + 10);
      doc.fontSize(12).font('Bold').text(invoiceDetails.orderNumber, 220, currentY + 30, { width: 150 });
      
      doc.fontSize(11).font('Normal').text('Invoice Date:', 400, currentY + 10);
      doc.fontSize(12).font('Bold').text(invoiceDetails.invoiceDate, 400, currentY + 30, { width: 150 });
      
      currentY += 80;

      // Billing and Shipping Information
      doc.fontSize(12).fillColor('#2d3748').text('Bill To:', 40, currentY);
      currentY += 20;
      
      doc.fontSize(10).fillColor('#4a5568').text(billingInfo.name, 40, currentY);
      currentY += 15;
      doc.text(billingInfo.address, 40, currentY);
      currentY += 15;
      doc.text(`${billingInfo.city}, ${billingInfo.state} - ${billingInfo.pincode}`, 40, currentY);
      currentY += 15;
      doc.text(`Phone: ${billingInfo.phone}`, 40, currentY);
      currentY += 15;
      doc.text(`Email: ${billingInfo.email}`, 40, currentY);
      currentY += 25;

      // Payment Information
      doc.fontSize(12).fillColor('#2d3748').text('Payment Details:', 40, currentY);
      currentY += 20;
      
      doc.fontSize(10).fillColor('#4a5568').text(`Payment Method: ${invoiceDetails.paymentMethod}`, 40, currentY);
      currentY += 15;
      doc.text(`Payment Status: ${invoiceDetails.paymentStatus}`, 40, currentY);
      currentY += 15;
      doc.text(`Place of Supply: ${invoiceDetails.placeOfSupply}`, 40, currentY);
      currentY += 15;
      doc.text(`Place of Origin: ${invoiceDetails.placeOfOrigin}`, 40, currentY);
      currentY += 30;

      // Items Table
      const tableStartY = currentY;
      const headerHeight = 25;
      const rowHeight = 25;
      const tableWidth = 530;
      
      // Table headers
      doc.rect(40, tableStartY, tableWidth, headerHeight).fill('#f7fafc').stroke();
      doc.fontSize(10).fillColor('#2d3748').font('Bold');
      
      const headers = [
        { text: 'Item Description', x: 45, width: 200 },
        { text: 'Variant', x: 250, width: 60 },
        { text: 'Qty', x: 315, width: 40 },
        { text: 'Unit Price', x: 360, width: 80 },
        { text: 'GST', x: 445, width: 60 },
        { text: 'Total', x: 510, width: 60 }
      ];
      
      headers.forEach(header => {
        doc.text(header.text, header.x, tableStartY + 8, { width: header.width, align: 'center' });
      });
      
      // Table rows
      doc.font('Normal').fillColor('#4a5568');
      items.forEach((item, index) => {
        const rowY = tableStartY + headerHeight + (index * rowHeight);
        
        // Row border
        doc.rect(40, rowY, tableWidth, rowHeight).stroke();
        
        // Alternating row background
        if (index % 2 === 0) {
          doc.fillColor('#fafafa').rect(40, rowY, tableWidth, rowHeight).fill();
          doc.fillColor('#4a5568');
        }
        
        // Item description
        const description = item.variant ? `${item.name} (${item.variant})` : item.name;
        doc.fontSize(9).text(description, 45, rowY + 8, { width: 200 });
        
        // Variant
        doc.fontSize(9).text(item.variant || '—', 250, rowY + 8, { width: 60, align: 'center' });
        
        // Quantity
        doc.fontSize(9).text(item.quantity.toString(), 315, rowY + 8, { width: 40, align: 'center' });
        
        // Unit Price
        doc.fontSize(9).text(formatINR(item.unitPrice), 360, rowY + 8, { width: 80, align: 'right' });
        
        // GST
        if (gstSummary.isInterState) {
          doc.fontSize(8).text(`IGST ${item.gstRate}%`, 445, rowY + 8, { width: 60, align: 'center' });
        } else {
          doc.fontSize(8).text(`CGST/SGST`, 445, rowY + 4, { width: 60, align: 'center' });
          doc.fontSize(8).text(`${item.gstRate/2}%`, 445, rowY + 14, { width: 60, align: 'center' });
        }
        
        // Total
        doc.fontSize(9).font('Bold').text(formatINR(item.total), 510, rowY + 8, { width: 60, align: 'right' });
        doc.font('Normal');
      });
      
      currentY = tableStartY + headerHeight + (items.length * rowHeight) + 20;

      // GST Summary
      doc.rect(40, currentY, 530, 80).stroke();
      doc.fontSize(12).fillColor('#2d3748').font('Bold').text('GST Summary:', 45, currentY + 10);
      doc.font('Normal').fillColor('#4a5568');
      
      if (gstSummary.isInterState) {
        doc.fontSize(10).text(`IGST (${gstSummary.gstRate}%): ${formatINR(gstSummary.igst)}`, 45, currentY + 30);
        doc.fontSize(10).text(`Total GST: ${formatINR(gstSummary.totalGST)}`, 45, currentY + 50);
      } else {
        doc.fontSize(10).text(`CGST (${gstSummary.gstRate/2}%): ${formatINR(gstSummary.cgst)}`, 45, currentY + 30);
        doc.fontSize(10).text(`SGST (${gstSummary.gstRate/2}%): ${formatINR(gstSummary.sgst)}`, 45, currentY + 50);
      }
      
      doc.fontSize(10).text(`Taxable Amount: ${formatINR(gstSummary.taxableAmount)}`, 300, currentY + 30);
      doc.fontSize(10).text(`Total Amount: ${formatINR(gstSummary.totalAmount)}`, 300, currentY + 50);
      
      currentY += 100;

      // Grand Total
      doc.fontSize(16).fillColor('#2d3748').font('Bold').text(`Grand Total: ${formatINR(gstSummary.totalAmount)}`, 40, currentY, { align: 'right' });
      currentY += 25;
      
      doc.fontSize(10).fillColor('#718096').font('Normal').text('Inclusive of all taxes', 40, currentY, { align: 'right' });
      currentY += 30;

      // Footer Information
      doc.rect(40, currentY, 530, 60).stroke();
      doc.fontSize(10).fillColor('#2d3748').font('Bold').text('GST Information:', 45, currentY + 10);
      doc.font('Normal').fillColor('#4a5568');
      doc.fontSize(9).text(`• This invoice is ${gstSummary.isInterState ? 'inter-state (IGST applicable)' : 'intra-state (CGST + SGST applicable)'}`, 45, currentY + 25);
      doc.fontSize(9).text(`• HSN Code: 0401 (Dairy Products) • GST Rate: ${gstSummary.gstRate}%`, 45, currentY + 40);
      
      currentY += 80;

      // Footer
      doc.fontSize(8).fillColor('#718096').text('This is a computer-generated invoice and does not require a signature.', 40, currentY, { align: 'center' });
      currentY += 15;
      doc.text('Thank you for your business! For any queries, please contact us at ' + companyInfo.email, 40, currentY, { align: 'center' });

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF
};
