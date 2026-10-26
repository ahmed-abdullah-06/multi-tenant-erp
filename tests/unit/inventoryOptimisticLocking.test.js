const inventoryService = require('../../server/src/modules/inventory/inventory.service');
const prisma = require('../../server/src/lib/prisma');
const { emitTenantEvent } = require('../../server/src/lib/socket');
const auditService = require('../../server/src/modules/audit/audit.service');

jest.mock('../../server/src/lib/prisma', () => ({
    inventoryBalance: {
        updateMany: jest.fn(),
        findUnique: jest.fn()
    },
    product: {
        updateMany: jest.fn(),
        findUnique: jest.fn()
    }
}));

jest.mock('../../server/src/lib/socket', () => ({
    emitTenantEvent: jest.fn()
}));

jest.mock('../../server/src/modules/audit/audit.service', () => ({
    logAction: jest.fn().mockResolvedValue({})
}));

describe('Inventory Optimistic Locking & Audit Trail', () => {
    const tenantId = 'tenant-100';
    const balanceId = 'bal-999';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('adjustStockSafely', () => {
        it('should successfully update stock and version when versions match', async () => {
            prisma.inventoryBalance.updateMany.mockResolvedValue({ count: 1 });
            prisma.inventoryBalance.findUnique.mockResolvedValue({
                id: balanceId,
                productId: 'prod-1',
                quantity: 45,
                version: 2,
                product: { id: 'prod-1', name: 'Widget A', minStockLevel: 10 }
            });

            const result = await inventoryService.adjustStockSafely(
                tenantId,
                balanceId,
                1, // current version
                15 // quantity change
            );

            expect(result).toBe(true);
            expect(prisma.inventoryBalance.updateMany).toHaveBeenCalledWith({
                where: {
                    id: balanceId,
                    organizationId: tenantId,
                    version: 1
                },
                data: {
                    quantity: { increment: 15 },
                    version: { increment: 1 }
                }
            });

            // Verify WebSocket update was emitted
            expect(emitTenantEvent).toHaveBeenCalledWith(tenantId, 'stock:updated', expect.objectContaining({
                productId: 'prod-1',
                balanceId,
                quantity: 45,
                version: 2
            }));

            // Verify Audit Log diff was recorded
            expect(auditService.logAction).toHaveBeenCalledWith(
                tenantId,
                null,
                expect.objectContaining({
                    action: 'UPDATE',
                    entityType: 'INVENTORY_BALANCE',
                    diff: {
                        quantity: { old: 30, new: 45 },
                        version: { old: 1, new: 2 }
                    }
                })
            );
        });

        it('should emit conflict event and throw Conflict error if version check fails', async () => {
            // Count 0 simulates another user updated the row first (version mismatch)
            prisma.inventoryBalance.updateMany.mockResolvedValue({ count: 0 });

            await expect(
                inventoryService.adjustStockSafely(tenantId, balanceId, 1, 10)
            ).rejects.toThrow(/Conflict: The record was modified by another user/i);

            // Verify WebSocket conflict event broadcasted to tenant
            expect(emitTenantEvent).toHaveBeenCalledWith(tenantId, 'stock:conflict', expect.objectContaining({
                balanceId,
                attemptedVersion: 1
            }));
        });

        it('should trigger low stock alert event when quantity drops below minStockLevel', async () => {
            prisma.inventoryBalance.updateMany.mockResolvedValue({ count: 1 });
            prisma.inventoryBalance.findUnique.mockResolvedValue({
                id: balanceId,
                productId: 'prod-2',
                quantity: 3, // Below minStockLevel of 10
                version: 4,
                warehouseId: 'wh-main',
                product: { id: 'prod-2', name: 'Low Stock Gadget', sku: 'LSG-01', minStockLevel: 10 }
            });

            await inventoryService.adjustStockSafely(tenantId, balanceId, 3, -10);

            expect(emitTenantEvent).toHaveBeenCalledWith(tenantId, 'stock:low', expect.objectContaining({
                productId: 'prod-2',
                productName: 'Low Stock Gadget',
                stock: 3,
                minStockLevel: 10
            }));
        });
    });
});
