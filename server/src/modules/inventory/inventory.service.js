const prisma = require('../../lib/prisma');

const createProduct = async (tenantId, productData) => {
    return await prisma.product.create({
        data: { ...productData, organizationId: tenantId }
    });
};

const getProducts = async (tenantId) => {
    return await prisma.product.findMany({
        where: { organizationId: tenantId }
    });
};

const getProductById = async (tenantId, productId) => {
    return await prisma.product.findFirst({
        where: { id: productId, organizationId: tenantId }
    });
};

const adjustStock = async (tenantId, productId, quantityChange) => {
    const result = await prisma.product.updateMany({
        where: { id: productId, organizationId: tenantId },
        data: { stock: { increment: quantityChange } }
    });
    if (result.count === 0) throw new Error("Product not found or access denied.");
    return result;
};

const deleteProduct = async (tenantId, productId) => {
    const result = await prisma.product.deleteMany({
        where: { id: productId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error("Product not found or access denied.");
    return result;
};

const transferStock = async (tenantId, sourceWarehouseId, destWarehouseId, items, notes = 'Internal Stock Transfer') => {
    return await prisma.$transaction(async (tx) => {
        // 1. Verify tenant isolation: Ensure both warehouses belong to the organization
        const warehouses = await tx.warehouse.findMany({
            where: {
                id: { in: [sourceWarehouseId, destWarehouseId] },
                organizationId: tenantId
            }
        });

        if (warehouses.length !== 2) {
            throw new Error('One or both warehouses not found or access denied.');
        }

        // 2. Create the master StockTransfer record
        const transfer = await tx.stockTransfer.create({
            data: {
                organizationId: tenantId,
                sourceWarehouseId,
                destinationWarehouseId,
                status: 'COMPLETED',
                notes,
                items: {
                    create: items.map(item => ({
                        productId: item.productId,
                        quantity: item.quantity
                    }))
                }
            },
            include: { items: true }
        });

        // 3. Process each item (matching the receivePurchaseOrder pattern)
        for (const item of items) {
            // Validate sufficient stock in the source warehouse
            const sourceBalance = await tx.inventoryBalance.findUnique({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: sourceWarehouseId
                    }
                }
            });

            if (!sourceBalance || sourceBalance.quantity < item.quantity) {
                throw new Error(`Insufficient stock for product ID: ${item.productId} in source warehouse.`);
            }

            // --- SOURCE WAREHOUSE (DECREMENT & OUT) ---
            await tx.inventoryBalance.update({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: sourceWarehouseId
                    }
                },
                data: { quantity: { decrement: item.quantity } }
            });

            await tx.stockMovement.create({
                data: {
                    organizationId: tenantId,
                    productId: item.productId,
                    warehouseId: sourceWarehouseId,
                    type: 'OUT',
                    quantity: -item.quantity,
                    referenceType: 'TRANSFER',
                    referenceId: transfer.id,
                    notes: `Transferred to warehouse ${destWarehouseId}`
                }
            });

            // --- DESTINATION WAREHOUSE (INCREMENT & IN) ---
            await tx.inventoryBalance.upsert({
                where: {
                    productId_warehouseId: {
                        productId: item.productId,
                        warehouseId: destWarehouseId
                    }
                },
                update: { quantity: { increment: item.quantity } },
                create: {
                    organizationId: tenantId,
                    productId: item.productId,
                    warehouseId: destWarehouseId,
                    quantity: item.quantity
                }
            });

            await tx.stockMovement.create({
                data: {
                    organizationId: tenantId,
                    productId: item.productId,
                    warehouseId: destWarehouseId,
                    type: 'IN',
                    quantity: item.quantity,
                    referenceType: 'TRANSFER',
                    referenceId: transfer.id,
                    notes: `Transferred from warehouse ${sourceWarehouseId}`
                }
            });
        }

        return transfer;
    });
};

module.exports = { 
    createProduct,
    getProducts,
    getProductById,
    adjustStock,
    deleteProduct,
    transferStock 
};