const inventoryService = require('../../server/src/modules/inventory/inventory.service');

// Mock Prisma client
jest.mock('../../server/src/lib/prisma', () => ({
  product: {
    create: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    findUnique: jest.fn(),
    updateMany: jest.fn(),
    deleteMany: jest.fn()
  },
  inventoryBalance: {
    updateMany: jest.fn(),
    findUnique: jest.fn(),
    upsert: jest.fn()
  },
  stockTransfer: {
    create: jest.fn()
  },
  stockMovement: {
    create: jest.fn()
  },
  warehouse: {
    findMany: jest.fn()
  },
  webhookEndpoint: {
    // dispatchWebhookEvent runs on stock events — resolve to "no endpoints" in unit tests
    findMany: jest.fn().mockResolvedValue([])
  }
}));

// Mock socket
jest.mock('../../server/src/lib/socket', () => ({
  emitTenantEvent: jest.fn()
}));

// Mock audit service
jest.mock('../../server/src/modules/audit/audit.service', () => ({
  logAction: jest.fn()
}));

const prisma = require('../../server/src/lib/prisma');
const { emitTenantEvent } = require('../../server/src/lib/socket');
const auditService = require('../../server/src/modules/audit/audit.service');

describe('Inventory Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProduct', () => {
    test('should create a product with tenantId', async () => {
      const tenantId = 'test-tenant-id';
      const productData = { name: 'Test Product', price: 99.99 };
      const mockProduct = { id: 'test-id', ...productData, organizationId: tenantId };

      prisma.product.create.mockResolvedValue(mockProduct);

      const result = await inventoryService.createProduct(tenantId, productData);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.create).toHaveBeenCalledWith({
        data: { ...productData, organizationId: tenantId }
      });
    });
  });

  describe('getProducts', () => {
    test('should get products with default limit', async () => {
      const tenantId = 'test-tenant-id';
      const mockProducts = [
        { id: '1', name: 'Product 1', price: 99.99 },
        { id: '2', name: 'Product 2', price: 49.99 }
      ];

      prisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await inventoryService.getProducts(tenantId, {});

      expect(result).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: tenantId }),
          take: 50
        })
      );
    });

    test('should search products by name', async () => {
      const tenantId = 'test-tenant-id';
      const search = 'laptop';
      const mockProducts = [
        { id: '1', name: 'Gaming Laptop', sku: 'GL-001', price: 999.99 }
      ];

      prisma.product.findMany.mockResolvedValue(mockProducts);

      const result = await inventoryService.getProducts(tenantId, { search });

      expect(result).toEqual(mockProducts);
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { name: { contains: 'laptop', mode: 'insensitive' } },
              { sku: { contains: 'laptop', mode: 'insensitive' } }
            ]
          })
        })
      );
    });
  });

  describe('getProductById', () => {
    test('should get product by id', async () => {
      const tenantId = 'test-tenant-id';
      const productId = 'test-product-id';
      const mockProduct = { id: productId, name: 'Test Product', price: 99.99 };

      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await inventoryService.getProductById(tenantId, productId);

      expect(result).toEqual(mockProduct);
      expect(prisma.product.findFirst).toHaveBeenCalledWith({
        where: { id: productId, organizationId: tenantId }
      });
    });
  });

  describe('adjustStock', () => {
    test('should adjust stock and emit events', async () => {
      const tenantId = 'test-tenant-id';
      const productId = 'test-product-id';
      const quantityChange = 5;
      const mockProduct = { id: productId, name: 'Test Product', stock: 100 };

      prisma.product.updateMany.mockResolvedValue({ count: 1 });
      prisma.product.findUnique.mockResolvedValue(mockProduct);

      const result = await inventoryService.adjustStock(tenantId, productId, quantityChange);

      expect(result).toEqual({ count: 1 });
      expect(prisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: productId, organizationId: tenantId },
        data: { stock: { increment: quantityChange } }
      });
      expect(emitTenantEvent).toHaveBeenCalledWith(tenantId, 'stock:updated', {
        productId,
        stock: mockProduct.stock
      });
    });

    test('should throw error if product not found', async () => {
      const tenantId = 'test-tenant-id';
      const productId = 'non-existent-id';

      prisma.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(inventoryService.adjustStock(tenantId, productId, 5)).rejects.toThrow(
        'Product not found or access denied.'
      );
    });
  });

  describe('deleteProduct', () => {
    test('should delete product', async () => {
      const tenantId = 'test-tenant-id';
      const productId = 'test-product-id';

      prisma.product.deleteMany.mockResolvedValue({ count: 1 });

      const result = await inventoryService.deleteProduct(tenantId, productId);

      expect(result).toEqual({ count: 1 });
      expect(prisma.product.deleteMany).toHaveBeenCalledWith({
        where: { id: productId, organizationId: tenantId }
      });
    });
  });
});
