const prisma = require('../../lib/prisma');
const { emitTenantEvent } = require('../../lib/socket');
const auditService = require('../audit/audit.service');

const createProduct = async (tenantId, productData) => {
    return await prisma.product.create({
        data: { ...productData, organizationId: tenantId }
    });
};

const getProducts = async (organizationId, { search, categoryId, minPrice, maxPrice, limit = 50, offset = 0 } = {}) => {
    // Build the dynamic where clause
    const whereClause = {
        organizationId: organizationId
    };

    // Text search on name or SKU
    if (search) {
        whereClause.OR = [
            { name: { contains: search, mode: 'insensitive' } },
            { sku: { contains: search, mode: 'insensitive' } }
        ];
    }

    if (categoryId) whereClause.categoryId = categoryId;
    
    if (minPrice || maxPrice) {
        whereClause.price = {};
        if (minPrice) whereClause.price.gte = parseFloat(minPrice);
        if (maxPrice) whereClause.price.lte = parseFloat(maxPrice);
    }

    return await prisma.product.findMany({
        where: whereClause,
        take: parseInt(limit, 10),
        skip: parseInt(offset, 10),
        include: {
            inventoryBalances: true,
            category: true
        },
        orderBy: { createdAt: 'desc' }
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

    try {
        const prod = await prisma.product.findUnique({ where: { id: productId } });
        if (prod) {
            if (prod.stock <= (prod.minStockLevel || 0)) {
                emitTenantEvent(tenantId, 'stock:low', {
                    productId: prod.id,
                    productName: prod.name,
                    sku: prod.sku,
                    stock: prod.stock,
                    minStockLevel: prod.minStockLevel
                });
            }
            emitTenantEvent(tenantId, 'stock:updated', {
                productId: prod.id,
                stock: prod.stock
            });

            // Log enriched audit trail with before/after diff
            await auditService.logAction(tenantId, null, {
                action: 'UPDATE',
                entityType: 'PRODUCT',
                entityId: prod.id,
                details: {
                    productName: prod.name,
                    sku: prod.sku,
                    quantityChange
                },
                diff: {
                    stock: { old: prod.stock - quantityChange, new: prod.stock }
                }
            });
        }
    } catch (err) {
        // Safe failover
    }

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

// ... existing imports and functions (createProduct, getProducts, transferStock, etc.)

const adjustStockSafely = async (tenantId, balanceId, currentVersion, quantityChange) => {
    // Attempt to update ONLY if the version matches what the client originally read
    const result = await prisma.inventoryBalance.updateMany({
        where: { 
            id: balanceId, 
            organizationId: tenantId,
            version: currentVersion // <-- The Optimistic Lock Check
        },
        data: { 
            quantity: { increment: quantityChange },
            version: { increment: 1 } // <-- Increment the version for the next edit
        }
    });

    if (result.count === 0) {
        // Real-Time Optimistic Lock Conflict notification
        emitTenantEvent(tenantId, 'stock:conflict', {
            balanceId,
            attemptedVersion: currentVersion,
            message: 'A concurrent stock adjustment conflict occurred. Inventory balances were modified by another session.'
        });

        // The count is 0 because the version changed between read and write.
        throw new Error('Conflict: The record was modified by another user. Please refresh and try again.');
    }

    try {
        const balance = await prisma.inventoryBalance.findUnique({
            where: { id: balanceId },
            include: { product: true }
        });
        if (balance && balance.product) {
            if (balance.quantity <= (balance.product.minStockLevel || 0)) {
                emitTenantEvent(tenantId, 'stock:low', {
                    productId: balance.product.id,
                    productName: balance.product.name,
                    sku: balance.product.sku,
                    stock: balance.quantity,
                    minStockLevel: balance.product.minStockLevel,
                    warehouseId: balance.warehouseId
                });
            }
            emitTenantEvent(tenantId, 'stock:updated', {
                productId: balance.productId,
                balanceId: balance.id,
                quantity: balance.quantity,
                version: balance.version
            });

            // Log enriched audit trail with before/after diff
            await auditService.logAction(tenantId, null, {
                action: 'UPDATE',
                entityType: 'INVENTORY_BALANCE',
                entityId: balanceId,
                details: {
                    productName: balance.product.name,
                    sku: balance.product.sku,
                    quantityChange
                },
                diff: {
                    quantity: { old: balance.quantity - quantityChange, new: balance.quantity },
                    version: { old: currentVersion, new: balance.version }
                }
            });
        }
    } catch (err) {
        // Safe failover
    }

    return true;
};

// Don't forget to add it to your exports at the bottom!
module.exports = { 
    createProduct,
    getProducts,
    getProductById,
    adjustStock,
    deleteProduct,
    transferStock,
    adjustStockSafely // <-- Added here
};