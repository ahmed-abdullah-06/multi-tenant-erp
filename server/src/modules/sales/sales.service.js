const prisma = require('../../lib/prisma');

// Customers
const getCustomers = async (tenantId) => {
    return await prisma.customer.findMany({
        where: { organizationId: tenantId }
    });
};

const getCustomerById = async (tenantId, customerId) => {
    return await prisma.customer.findFirst({
        where: { id: customerId, organizationId: tenantId }
    });
};

const createCustomer = async (tenantId, data) => {
    return await prisma.customer.create({
        data: { ...data, organizationId: tenantId }
    });
};

const updateCustomer = async (tenantId, customerId, data) => {
    const result = await prisma.customer.updateMany({
        where: { id: customerId, organizationId: tenantId },
        data
    });
    if (result.count === 0) throw new Error('Customer not found or access denied');
    return result;
};

const deleteCustomer = async (tenantId, customerId) => {
    const result = await prisma.customer.deleteMany({
        where: { id: customerId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Customer not found or access denied');
    return result;
};

// Quotes
const getQuotes = async (tenantId) => {
    return await prisma.quote.findMany({
        where: { organizationId: tenantId },
        include: { customer: true, items: { include: { product: true } } },
        orderBy: { createdAt: 'desc' }
    });
};

const createQuote = async (tenantId, { customerId, quoteNumber, validUntil, notes, items }) => {
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

    return await prisma.quote.create({
        data: {
            organizationId: tenantId,
            customerId,
            quoteNumber: quoteNumber || `QT-${Date.now()}`,
            validUntil: validUntil ? new Date(validUntil) : null,
            notes,
            totalAmount,
            status: 'DRAFT',
            items: {
                create: computedItems
            }
        },
        include: { items: true, customer: true }
    });
};

// Sales Orders
const getSalesOrders = async (tenantId) => {
    return await prisma.salesOrder.findMany({
        where: { organizationId: tenantId },
        include: { customer: true, items: { include: { product: true } }, invoices: true },
        orderBy: { createdAt: 'desc' }
    });
};

const getSalesOrderById = async (tenantId, orderId) => {
    return await prisma.salesOrder.findFirst({
        where: { id: orderId, organizationId: tenantId },
        include: { customer: true, items: { include: { product: true } }, invoices: true }
    });
};

const createSalesOrder = async (tenantId, { customerId, orderNumber, notes, items }) => {
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

    return await prisma.salesOrder.create({
        data: {
            organizationId: tenantId,
            customerId,
            orderNumber: orderNumber || `SO-${Date.now()}`,
            notes,
            totalAmount,
            status: 'PENDING',
            items: {
                create: computedItems
            }
        },
        include: { items: true, customer: true }
    });
};

// Fulfilling / Shipping Sales Order: checks stock, decreases stock atomically, logs stock movement
const fulfillSalesOrder = async (tenantId, orderId, { warehouseId }) => {
    return await prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.findFirst({
            where: { id: orderId, organizationId: tenantId },
            include: { items: true }
        });

        if (!so) throw new Error('Sales order not found or access denied');
        if (so.status === 'SHIPPED' || so.status === 'DELIVERED') {
            throw new Error(`Sales order already fulfilled: ${so.status}`);
        }
        if (so.status === 'CANCELLED') {
            throw new Error('Cannot fulfill a cancelled sales order');
        }

        for (const item of so.items) {
            // Check stock availability
            const product = await tx.product.findFirst({
                where: { id: item.productId, organizationId: tenantId }
            });
            if (!product || product.stock < item.quantity) {
                throw new Error(`Insufficient stock for product ${product ? product.name : item.productId}. Available: ${product ? product.stock : 0}, requested: ${item.quantity}`);
            }

            // Deduct product stock
            await tx.product.updateMany({
                where: { id: item.productId, organizationId: tenantId },
                data: { stock: { decrement: item.quantity } }
            });

            // If warehouse specified, deduct warehouse balance and write movement
            if (warehouseId) {
                await tx.inventoryBalance.upsert({
                    where: {
                        productId_warehouseId: {
                            productId: item.productId,
                            warehouseId
                        }
                    },
                    update: { quantity: { decrement: item.quantity } },
                    create: {
                        organizationId: tenantId,
                        productId: item.productId,
                        warehouseId,
                        quantity: -item.quantity
                    }
                });

                await tx.stockMovement.create({
                    data: {
                        organizationId: tenantId,
                        productId: item.productId,
                        warehouseId,
                        type: 'SALE',
                        quantity: -item.quantity,
                        referenceType: 'SALES_ORDER',
                        referenceId: so.id,
                        notes: `Fulfillment for SO #${so.orderNumber}`
                    }
                });
            }
        }

        // Mark as shipped
        await tx.salesOrder.updateMany({
            where: { id: orderId, organizationId: tenantId },
            data: { status: 'SHIPPED' }
        });

        // Automatically create an invoice if one doesn't exist
        const invoice = await tx.invoice.create({
            data: {
                organizationId: tenantId,
                customerId: so.customerId,
                salesOrderId: so.id,
                invoiceNumber: `INV-${Date.now()}`,
                totalAmount: so.totalAmount,
                status: 'ISSUED'
            }
        });

        return { salesOrderId: so.id, status: 'SHIPPED', invoice };
    });
};

const cancelSalesOrder = async (tenantId, orderId) => {
    const so = await prisma.salesOrder.findFirst({
        where: { id: orderId, organizationId: tenantId }
    });
    if (!so) throw new Error('Sales order not found or access denied');
    if (so.status === 'SHIPPED' || so.status === 'DELIVERED') {
        throw new Error('Cannot cancel an already fulfilled sales order');
    }

    return await prisma.salesOrder.updateMany({
        where: { id: orderId, organizationId: tenantId },
        data: { status: 'CANCELLED' }
    });
};

// Invoices & Payments
const getInvoices = async (tenantId) => {
    return await prisma.invoice.findMany({
        where: { organizationId: tenantId },
        include: { customer: true, payments: true },
        orderBy: { createdAt: 'desc' }
    });
};

const getInvoiceById = async (tenantId, invoiceId) => {
    return await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId: tenantId },
        include: { customer: true, payments: true, salesOrder: { include: { items: true } } }
    });
};

const recordPayment = async (tenantId, invoiceId, { amount, paymentMethod, reference }) => {
    return await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findFirst({
            where: { id: invoiceId, organizationId: tenantId }
        });
        if (!invoice) throw new Error('Invoice not found or access denied');
        if (invoice.status === 'PAID') throw new Error('Invoice is already fully paid');

        const payment = await tx.payment.create({
            data: {
                organizationId: tenantId,
                invoiceId,
                amount,
                paymentMethod: paymentMethod || 'BANK_TRANSFER',
                reference,
                status: 'COMPLETED'
            }
        });

        const newPaidAmount = invoice.paidAmount + amount;
        const newStatus = newPaidAmount >= invoice.totalAmount ? 'PAID' : 'PARTIALLY_PAID';

        await tx.invoice.updateMany({
            where: { id: invoiceId, organizationId: tenantId },
            data: {
                paidAmount: newPaidAmount,
                status: newStatus
            }
        });

        return payment;
    });
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer,
    getQuotes,
    createQuote,
    getSalesOrders,
    getSalesOrderById,
    createSalesOrder,
    fulfillSalesOrder,
    cancelSalesOrder,
    getInvoices,
    getInvoiceById,
    recordPayment
};
