const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const generateApiKey = async (organizationId, name) => {
  // Generate a secure 64-character random string with a prefix
  const rawKey = crypto.randomBytes(32).toString('hex');
  const fullKey = `erp_${rawKey}`;

  // Hash the key for secure database storage
  const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');

  // Save to the database using your existing schema
  await prisma.apiKey.create({
    data: {
      organizationId,
      name,
      keyHash: hashedKey,
      isActive: true
    }
  });

  // Return the raw key to the user one time only
  return fullKey;
};

module.exports = { generateApiKey };