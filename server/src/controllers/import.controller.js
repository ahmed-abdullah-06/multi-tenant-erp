// server/controllers/import.controller.js
const { PrismaClient } = require('@prisma/client');
const { parse } = require('csv-parse');
const fs = require('fs');

const prisma = new PrismaClient();

// Note: Ensure a multer middleware like upload.single('file') runs before this
const importInventoryCsv = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });

  const records = [];

  // Stream the file to prevent memory bloat
  fs.createReadStream(req.file.path)
    .pipe(parse({ columns: true, skip_empty_lines: true }))
    .on('data', (row) => {
      records.push({
        organizationId: req.organizationId,
        sku: row.sku,
        name: row.name,
        quantity: parseInt(row.quantity, 10) || 0,
        price: parseFloat(row.price) || 0.0
      });
    })
    .on('end', async () => {
      try {
        // Bulk insert the processed records
        const result = await prisma.product.createMany({
          data: records,
          skipDuplicates: true // Safe handling for existing SKUs
        });
        
        // Clean up the temporary uploaded file
        fs.unlinkSync(req.file.path); 
        
        res.status(201).json({ message: `Successfully imported ${result.count} products` });
      } catch (error) {
        res.status(500).json({ error: 'Database insertion failed' });
      }
    });
};

module.exports = { importInventoryCsv };