const prisma = require('../../lib/prisma');

// Suppliers
const getSuppliers = async (tenantId) => {
    return await prisma.supplier.findMany({
        where: { organizationId: tenantId }
    });
};

const getSupplierById = async (tenantId, supplierId) => {
    return await prisma.supplier.findFirst({
        where: { id: supplierId, organizationId: tenantId }
    });
};

const createSupplier = async (tenantId, data) => {
    return await prisma.supplier.create({
        data: { ...data, organizationId: tenantId }
    });
};

const updateSupplier = async (tenantId, supplierId, data) => {
    const result = await prisma.supplier.updateMany({
        where: { id: supplierId, organizationId: tenantId },
        data
    });
    if (result.count === 0) throw new Error('Supplier not found or access denied');
    return result;
};

const deleteSupplier = async (tenantId, supplierId) => {
    const result = await prisma.supplier.deleteMany({
        where: { id: supplierId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Supplier not found or access denied');
    return result;
};

// Purchase Orders
const getPurchaseOrders = async (tenantId) => {
    return await prisma.purchaseOrder.findMany({
        where: { organizationId: tenantId },
        include: { supplier: true, items: { include: { product: true } }, goodsReceipts: true },
        orderBy: { createdAt: 'desc' }
    });
};

const getPurchaseOrderById = async (tenantId, orderId) => {
    return await prisma.purchaseOrder.findFirst({
        where: { id: orderId, organizationId: tenantId },
        include: { supplier: true, items: { include: { product: true } }, goodsReceipts: true }
    });
};

const createPurchaseOrder = async (tenantId, { supplierId, orderNumber, notes, items }) => {
    let totalAmount = 0;
    const computedItems = (items || []).map(item => {
        const itemTotal = (item.quantity || 0) * (item.unitPrice || 0);
        totalAmount += itemTotal;
        return {
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: itemTotal
        };
    });

    return await prisma.purchaseOrder.create({
        data: {
            organizationId: tenantId,
            supplierId,
            orderNumber: orderNumber || `PO-${Date.now()}`,
            notes,
            totalAmount,
            status: 'ISSUED',
            items: {
                create: computedItems
            }
        },
        include: { items: true, supplier: true }
    });
};

// Receiving stock for PO: increases stock, creates GoodsReceipt & StockMovements within a transaction
const receivePurchaseOrder = async (tenantId, orderId, { receiptNumber, warehouseId, notes }) => {
    return await prisma.$transaction(async (tx) => {
        const po = await tx.purchaseOrder.findFirst({
            where: { id: orderId, organizationId: tenantId },
            include: { items: true }
        });

        if (!po) throw new Error('Purchase Order not found or access denied');
        if (po.status === 'RECEIVED' || po.status === 'CANCELLED') {
            throw new Error(`Cannot receive purchase order in ${po.status} status`);
        }

        const goodsReceipt = await tx.goodsReceipt.create({
            data: {
                organizationId: tenantId,
                purchaseOrderId: po.id,
                receiptNumber: receiptNumber || `REC-${Date.now()}`,
                notes
            }
        });

        for (const item of po.items) {
            // 1. Increment product global stock
            await tx.product.updateMany({
                where: { id: item.productId, organizationId: tenantId },
                data: { stock: { increment: item.quantity } }
            });

            // 2. Increment or create warehouse balance if warehouse provided
            if (warehouseId) {
                await tx.inventoryBalance.upsert({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId
                        }
                    },
                    update: { quantity: { increment: item.quantity } },
                    create: {
                        organizationId: tenantId,
                        productId: item.productId,
                        warehouseId,
                        quantity: item.quantity
                    }
                });

                // 3. Stock movement log
                await tx.stockMovement.create({
                    data: {
                        organizationId: tenantId,
                        productId: item.productId,
                        warehouseId,
                        type: 'PURCHASE',
                        quantity: item.quantity,
                        referenceType: 'PURCHASE_ORDER',
                        referenceId: po.id,
                        notes: `Received via PO #${po.orderNumber}`
                    }
                });
            }
        }

        await tx.purchaseOrder.updateMany({
            where: { id: orderId, organizationId: tenantId },
            data: { status: 'RECEIVED' }
        });

        return goodsReceipt;
    });
};

const cancelPurchaseOrder = async (tenantId, orderId) => {
    const po = await prisma.purchaseOrder.findFirst({
        where: { id: orderId, organizationId: tenantId }
    });
    if (!po) throw new Error('Purchase order not found or access denied');
    if (po.status === 'RECEIVED') throw new Error('Cannot cancel a received purchase order');

    return await prisma.purchaseOrder.updateMany({
        where: { id: orderId, organizationId: tenantId },
        data: { status: 'CANCELLED' }
    });
};

module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier,
    getPurchaseOrders,
    getPurchaseOrderById,
    createPurchaseOrder,
    receivePurchaseOrder,
    cancelPurchaseOrder
};
