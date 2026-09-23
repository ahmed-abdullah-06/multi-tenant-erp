const { PrismaClient } = require('@prisma/client');
const { generateInvoicePdf } = require('../services/pdf.service');

const prisma = new PrismaClient();

const downloadInvoice = async (req, res) => {
  try {
    const invoiceId = req.params.id;

    // Fetch the invoice and ensure it belongs to the current tenant
    const invoiceRecord = await prisma.invoice.findFirst({
      where: { 
        id: invoiceId,
        organizationId: req.organizationId 
      },
      include: { items: true } 
    });

    if (!invoiceRecord) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const pdfBuffer = await generateInvoicePdf(invoiceRecord);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="invoice_${invoiceId}.pdf"`);
    res.status(200).send(pdfBuffer);
    
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate PDF document' });
  }
};

module.exports = { downloadInvoice };