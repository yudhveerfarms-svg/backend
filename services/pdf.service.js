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
          top: 50,
          bottom: 50,
          left: 50,
          right: 50
        }
      });

      // Register a font that supports Unicode characters
      doc.registerFont('Normal', 'Helvetica');
      doc.registerFont('Bold', 'Helvetica-Bold');
      
      // Set default font
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
        // Use "Rs." for better PDF compatibility instead of Unicode symbol
        return `Rs.${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      };

      // Header - Professional styling with logo like admin invoice
      try {
        // Add logo if available
        const logoPath = path.join(__dirname, '../../frontend/public/images/logo.png');
        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, 50, doc.y, { width: 60, height: 60 });
          doc.x = 120;
          doc.y = doc.y + 20;
        } else {
          doc.x = 50;
        }
        
        // Company info next to logo
        doc.fontSize(18).fillColor('#2d3748').text(companyInfo.name);
        doc.fontSize(12).fillColor('#4a5568').text('Pure · Natural · Organic');
        doc.fontSize(10).fillColor('#718096').text('Farm-fresh dairy, stone-ground staples, and cold-pressed oils — crafted with care for your table.');
        doc.moveDown(2);
        
        // Invoice info on the right
        const rightY = doc.y - 60;
        doc.fontSize(10).fillColor('#718096').text('Invoice', 400, rightY);
        doc.fontSize(16).fillColor('#2d3748').text(invoiceDetails.invoiceNumber || invoiceDetails.orderNumber, 400, rightY + 15);
        doc.fontSize(9).fillColor('#4a5568').text(`Date: ${invoiceDetails.invoiceDate}`, 400, rightY + 35);
        doc.fontSize(9).fillColor('#4a5568').text(`Order: ${invoiceDetails.orderNumber}`, 400, rightY + 50);
        
        doc.y = rightY + 70;
        doc.moveDown(2);
      } catch (logoError) {
        // Fallback if logo fails
        doc.fontSize(24).fillColor('#2d3748').text('TAX INVOICE', { align: 'center' });
        doc.fontSize(14).fillColor('#4a5568').text(`${companyInfo.name}`, { align: 'center' });
        doc.fontSize(10).fillColor('#718096').text(`GSTIN: ${companyInfo.gstin} | ${companyInfo.state} (${companyInfo.stateCode})`, { align: 'center' });
        doc.moveDown(2);
      }

      // Company and Customer Info - Grid layout like admin invoice
      doc.fontSize(10).fillColor('#4a5568');
      
      const billingInfoY = doc.y;
      
      // Bill to section (left)
      doc.fontSize(10).fillColor('#718096').text('Bill to', 50, billingInfoY);
      doc.fontSize(11).fillColor('#2d3748').font('Helvetica-Bold').text(billingInfo.name || '—', 50, billingInfoY + 15);
      doc.fontSize(10).fillColor('#4a5568').font('Helvetica').text(billingInfo.email || '—', 50, billingInfoY + 30);
      doc.text(billingInfo.phone || '—', 50, billingInfoY + 45);
      doc.text(billingInfo.address || '—', 50, billingInfoY + 60);
      doc.text(`${[billingInfo.city, billingInfo.state].filter(Boolean).join(', ')} - ${billingInfo.pincode}`, 50, billingInfoY + 75);
      
      // Payment section (right)
      doc.fontSize(10).fillColor('#718096').text('Payment', 300, billingInfoY);
      doc.fontSize(10).fillColor('#4a5568').text(`Method: ${invoiceDetails.paymentMethod}`, 300, billingInfoY + 15);
      doc.text(`Status: ${invoiceDetails.paymentStatus}`, 300, billingInfoY + 30);
      
      doc.y = billingInfoY + 100; // Reset Y position after layout
      doc.moveDown(2);

      // Invoice Details Box
      doc.rect(50, doc.y, 500, 80).stroke();
      const detailsY = doc.y + 10;
      doc.fontSize(10);
      doc.text('Invoice Details:', 60, detailsY, { bold: true });
      doc.text(`Invoice Number: ${invoiceDetails.invoiceNumber}`, 60, detailsY + 15);
      doc.text(`Order Number: ${invoiceDetails.orderNumber}`, 60, detailsY + 30);
      doc.text(`Invoice Date: ${invoiceDetails.invoiceDate}`, 60, detailsY + 45);
      doc.text(`Payment Method: ${invoiceDetails.paymentMethod}`, 60, detailsY + 60);

      doc.text(`Place of Supply: ${invoiceDetails.placeOfSupply}`, 300, detailsY + 15);
      doc.text(`Place of Origin: ${invoiceDetails.placeOfOrigin}`, 300, detailsY + 30);
      doc.text(`Payment Status: ${invoiceDetails.paymentStatus}`, 300, detailsY + 45);

      doc.y = detailsY + 90;
      doc.moveDown();

      // Items Table
      const tableTop = doc.y;
      const itemHeight = 20;
      const tableWidth = 500;
      
      // Table Headers - Professional styling
      const headers = ['Item Description', 'Variant', 'Qty', 'Unit Price', 'GST', 'Total'];
      const columnWidths = [220, 70, 50, 80, 60, 120]; // Increased column widths
      const cellPadding = 8; // Increased padding
      let currentX = 50;

      // Add header background
      doc.fillColor('#f7fafc').rect(50, tableTop, columnWidths.reduce((sum, width) => sum + width, 0), 15).fill();
      
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#2d3748');
      headers.forEach((header, index) => {
        doc.text(header, currentX + cellPadding, tableTop + 2, { width: columnWidths[index] - (cellPadding * 2) });
        currentX += columnWidths[index];
      });

      // Table Items - Professional styling with alternating rows
      doc.font('Helvetica');
      items.forEach((item, index) => {
        const itemY = tableTop + 15 + (index * itemHeight);
        currentX = 50;

        // Add alternating row background
        if (index % 2 === 0) {
          doc.fillColor('#fafafa').rect(50, itemY - 2, columnWidths.reduce((sum, width) => sum + width, 0), itemHeight).fill();
        }

        // Reset text color
        doc.fillColor('#4a5568');

        // Item Description with variant if available
        const description = item.variant ? `${item.name} (${item.variant})` : item.name;
        doc.fontSize(9).text(description, currentX + cellPadding, itemY, { 
          width: columnWidths[0] - (cellPadding * 2),
          align: 'left'
        });
        currentX += columnWidths[0];

        // Variant (if separate) - Center aligned
        const variantText = item.variant || '';
        doc.fontSize(8).text(variantText, currentX + cellPadding, itemY, { 
          width: columnWidths[1] - (cellPadding * 2), 
          align: 'center' 
        });
        currentX += columnWidths[1];

        // Quantity - Center aligned
        doc.fontSize(8).text(item.quantity.toString(), currentX + cellPadding, itemY, { 
          width: columnWidths[2] - (cellPadding * 2), 
          align: 'center' 
        });
        currentX += columnWidths[2];

        // Unit Price - Right aligned
        doc.fontSize(8).text(formatINR(item.unitPrice), currentX + cellPadding, itemY, { 
          width: columnWidths[3] - (cellPadding * 2), 
          align: 'right' 
        });
        currentX += columnWidths[3];

        // GST - Better formatting with proper alignment
        if (gstSummary.isInterState) {
          // IGST on first line, percentage on second line, both centered
          doc.fontSize(8).text(`IGST`, currentX + cellPadding, itemY, { 
            width: columnWidths[4] - (cellPadding * 2), 
            align: 'center' 
          });
          doc.fontSize(8).text(`${item.gstRate}%`, currentX + cellPadding, itemY + 8, { 
            width: columnWidths[4] - (cellPadding * 2), 
            align: 'center' 
          });
        } else {
          // CGST/SGST on first line, percentage on second line, both centered
          doc.fontSize(8).text(`CGST/SGST`, currentX + cellPadding, itemY, { 
            width: columnWidths[4] - (cellPadding * 2), 
            align: 'center' 
          });
          doc.fontSize(8).text(`${item.gstRate/2}%`, currentX + cellPadding, itemY + 8, { 
            width: columnWidths[4] - (cellPadding * 2), 
            align: 'center' 
          });
        }
        currentX += columnWidths[4];

        // Total - Right aligned
        doc.fontSize(8).text(formatINR(item.total), currentX + cellPadding, itemY, { 
          width: columnWidths[5] - (cellPadding * 2), 
          align: 'right' 
        });

        // Draw row line - Updated to match new table width
        const newTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
        doc.moveTo(50, itemY + itemHeight).lineTo(50 + newTableWidth, itemY + itemHeight).stroke();
      });

      // Table Border - Updated width to match new column widths
      const newTableWidth = columnWidths.reduce((sum, width) => sum + width, 0);
      doc.rect(50, tableTop, newTableWidth, 15 + (items.length * itemHeight)).stroke();

      doc.y = tableTop + 25 + (items.length * itemHeight);
      doc.moveDown(2);

      // GST Summary Box
      doc.rect(50, doc.y, 500, 60).stroke();
      const gstY = doc.y + 10;
      doc.fontSize(10).font('Helvetica-Bold');
      doc.text('GST Summary:', 60, gstY);
      doc.font('Helvetica');
      
      if (gstSummary.isInterState) {
        doc.fontSize(9).text(`IGST (${gstSummary.gstRate}%): ${formatINR(gstSummary.igst)}`, 60, gstY + 15);
      } else {
        doc.fontSize(9).text(`CGST (${gstSummary.gstRate/2}%): ${formatINR(gstSummary.cgst)}`, 60, gstY + 15);
        doc.fontSize(9).text(`SGST (${gstSummary.gstRate/2}%): ${formatINR(gstSummary.sgst)}`, 60, gstY + 30);
      }
      
      doc.fontSize(9).text(`Total GST: ${formatINR(gstSummary.totalGST)}`, 300, gstY + 15);
      doc.fontSize(9).text(`Taxable Amount: ${formatINR(gstSummary.taxableAmount)}`, 300, gstY + 30);

      doc.y = gstY + 70;
      doc.moveDown(2);

      // Totals - Professional styling
      doc.fontSize(14).font('Helvetica-Bold').fillColor('#2d3748');
      doc.text(`Grand Total: ${formatINR(gstSummary.totalAmount)}`, { align: 'right' });
      
      doc.fontSize(9).font('Helvetica').fillColor('#718096');
      doc.text('Inclusive of all taxes', { align: 'right' });

      doc.moveDown(3);

      // Footer
      doc.fontSize(8).text('This is a computer-generated invoice and does not require a signature.', { align: 'center' });
      doc.text('Thank you for your business! For any queries, please contact us at ' + companyInfo.email, { align: 'center' });

      // GST Information Box
      doc.rect(50, doc.y + 10, 500, 40).stroke();
      const infoY = doc.y + 20;
      doc.fontSize(8);
      doc.text('GST Information:', 60, infoY, { bold: true });
      doc.text(`• This invoice is ${gstSummary.isInterState ? 'inter-state (IGST applicable)' : 'intra-state (CGST + SGST applicable)'}`, 60, infoY + 10);
      doc.text(`• HSN Code: 0401 (Dairy Products) • GST Rate: ${gstSummary.gstRate}%`, 60, infoY + 20);

      doc.end();

    } catch (error) {
      reject(error);
    }
  });
}

module.exports = {
  generateInvoicePDF
};
