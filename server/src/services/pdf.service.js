const PDFDocument = require('pdfkit');

const generateInvoicePdf = (invoiceData) => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const buffers = [];

    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => resolve(Buffer.concat(buffers)));
    doc.on('error', reject);

    // Header
    doc.fontSize(20).text('INVOICE', { align: 'right' });
    doc.fontSize(10).text(`Invoice Number: ${invoiceData.id}`);
    doc.text(`Date: ${new Date().toLocaleDateString()}`);
    doc.moveDown();

    // Billing Info
    doc.text(`Billed To: ${invoiceData.customerName}`);
    doc.moveDown(2);

    // Line Items
    doc.fontSize(12).text('Items:', { underline: true });
    doc.moveDown(0.5);
    
    if (invoiceData.items && invoiceData.items.length > 0) {
      invoiceData.items.forEach(item => {
        doc.fontSize(10).text(`${item.name} - ${item.quantity} x $${item.price}`);
      });
    }

    doc.moveDown(2);
    doc.fontSize(14).text(`Total: $${invoiceData.total}`, { align: 'right' });

    doc.end();
  });
};

module.exports = { generateInvoicePdf };