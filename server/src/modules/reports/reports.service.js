const prisma = require('../../lib/prisma');

const getDashboardSummary = async (tenantId) => {
    const [
        totalProducts,
        lowStockProducts,
        totalSalesOrders,
        totalInvoices,
        paidInvoices,
        totalExpenses,
        totalCustomers,
        totalEmployees
    ] = await Promise.all([
        prisma.product.count({ where: { organizationId: tenantId } }),
        prisma.product.count({
            where: {
                organizationId: tenantId,
                stock: { lte: 10 }
            }
        }),
        prisma.salesOrder.count({ where: { organizationId: tenantId } }),
        prisma.invoice.findMany({
            where: { organizationId: tenantId },
            select: { totalAmount: true, paidAmount: true, status: true }
        }),
        prisma.payment.aggregate({
            where: { organizationId: tenantId },
            _sum: { amount: true }
        }),
        prisma.expense.aggregate({
            where: { organizationId: tenantId },
            _sum: { amount: true }
        }),
        prisma.customer.count({ where: { organizationId: tenantId } }),
        prisma.employee.count({ where: { organizationId: tenantId } })
    ]);

    const totalRevenue = paidInvoices._sum.amount || 0;
    const totalExpenseAmount = totalExpenses._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenseAmount;

    return {
        products: {
            total: totalProducts,
            lowStock: lowStockProducts
        },
        sales: {
            totalOrders: totalSalesOrders,
            totalInvoicesCount: totalInvoices.length,
            totalRevenue,
            pendingInvoices: totalInvoices.filter(i => i.status !== 'PAID').length
        },
        expenses: {
            totalExpenseAmount
        },
        financials: {
            netProfit
        },
        customers: {
            total: totalCustomers
        },
        employees: {
            total: totalEmployees
        }
    };
};

const getSalesReport = async (tenantId) => {
    const orders = await prisma.salesOrder.findMany({
        where: { organizationId: tenantId },
        include: { customer: true },
        orderBy: { createdAt: 'desc' },
        take: 50
    });

    const aggregate = await prisma.salesOrder.aggregate({
        where: { organizationId: tenantId },
        _sum: { totalAmount: true },
        _count: { id: true }
    });

    return {
        totalRevenue: aggregate._sum.totalAmount || 0,
        totalOrders: aggregate._count.id || 0,
        recentOrders: orders
    };
};

const getInventoryReport = async (tenantId) => {
    const products = await prisma.product.findMany({
        where: { organizationId: tenantId },
        include: { category: true },
        orderBy: { stock: 'asc' }
    });

    const totalStock = products.reduce((acc, p) => acc + p.stock, 0);
    const totalAssetValue = products.reduce((acc, p) => acc + (p.stock * p.price), 0);

    return {
        totalStock,
        totalAssetValue,
        products
    };
};

const getExpenseReport = async (tenantId) => {
    const expenses = await prisma.expense.findMany({
        where: { organizationId: tenantId },
        include: { category: true },
        orderBy: { expenseDate: 'desc' }
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    return {
        totalExpenses,
        expenses
    };
};

module.exports = {
    getDashboardSummary,
    getSalesReport,
    getInventoryReport,
    getExpenseReport
};
