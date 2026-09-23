// server/controllers/export.controller.js
const { PrismaClient } = require('@prisma/client');
const { stringify } = require('csv-stringify/sync');

const prisma = new PrismaClient();

const exportInventoryCsv = async (req, res) => {
  try {
    // Fetch tenant-isolated data
    const inventory = await prisma.product.findMany({
      where: { organizationId: req.organizationId },
      select: { sku: true, name: true, quantity: true, price: true }
    });

    // Convert JSON array to CSV format
    const csvData = stringify(inventory, { header: true });

    // Set headers to trigger a file download in the browser
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory_export.csv"');
    
    res.status(200).send(csvData);
  } catch (error) {
    res.status(500).json({ error: 'Export failed' });
  }
};

module.exports = { exportInventoryCsv };