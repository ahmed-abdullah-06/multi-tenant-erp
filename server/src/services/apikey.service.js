const crypto = require('crypto');
const prisma = require('../lib/prisma');

const generateApiKey = async (organizationId, name) => {
  const rawKey = crypto.randomBytes(32).toString('hex');
  const fullKey = `erp_${rawKey}`;

  const hashedKey = crypto.createHash('sha256').update(fullKey).digest('hex');

  await prisma.apiKey.create({
    data: {
      organizationId,
      name,
      keyHash: hashedKey,
      isActive: true
    }
  });

  return fullKey;
};

const listApiKeys = async (organizationId) => {
  return await prisma.apiKey.findMany({
    where: { organizationId },
    select: {
      id: true,
      name: true,
      prefix: true,
      lastUsedAt: true,
      isActive: true,
      createdAt: true
    },
    orderBy: { createdAt: 'desc' }
  });
};

const revokeApiKey = async (organizationId, apiKeyId) => {
  const apiKey = await prisma.apiKey.findUnique({
    where: { id: apiKeyId }
  });

  if (!apiKey || apiKey.organizationId !== organizationId) {
    throw new Error('API key not found or access denied');
  }

  await prisma.apiKey.update({
    where: { id: apiKeyId },
    data: { isActive: false }
  });

  return true;
};

const validateApiKey = async (key) => {
  const hashedKey = crypto.createHash('sha256').update(key).digest('hex');

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash: hashedKey,
      isActive: true
    },
    include: {
      organization: true
    }
  });

  if (!apiKey) {
    throw new Error('Invalid API key');
  }

  await prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() }
  });

  return {
    organizationId: apiKey.organizationId,
    organizationName: apiKey.organization.name,
    organizationSlug: apiKey.organization.slug
  };
};

module.exports = {
  generateApiKey,
  listApiKeys,
  revokeApiKey,
  validateApiKey
};