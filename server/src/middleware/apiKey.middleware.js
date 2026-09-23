const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const requireApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];

  if (!apiKey) {
    return res.status(401).json({ error: 'API key header (x-api-key) is missing' });
  }

  // Hash the incoming key to compare against the stored hash
  const hashedKey = crypto.createHash('sha256').update(apiKey).digest('hex');

  try {
    const keyRecord = await prisma.apiKey.findFirst({
      where: { keyHash: hashedKey, isActive: true }
    });

    if (!keyRecord) {
      return res.status(403).json({ error: 'Invalid or inactive API key' });
    }

    // Attach the isolated tenant context to the request
    req.organizationId = keyRecord.organizationId;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during key validation' });
  }
};

module.exports = { requireApiKey };