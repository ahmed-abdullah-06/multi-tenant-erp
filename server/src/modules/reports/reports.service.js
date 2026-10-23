const prisma = require('../../lib/prisma');

const getReportDateRange = (startDate, endDate) => {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate
        ? new Date(startDate)
        : new Date(end.getTime() - (30 * 24 * 60 * 60 * 1000));

    if (endDate && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
        end.setUTCHours(23, 59, 59, 999);
    }

    return { start, end };
};

const getDashboardChartData = async (organizationId, startDate, endDate) => {
    const range = { gte: startDate, lte: endDate };
    const [invoices, expenses] = await Promise.all([
        prisma.invoice.findMany({
            where: {
                organizationId,
                status: 'PAID',
                createdAt: range
            },
            select: { totalAmount: true, createdAt: true }
        }),
        prisma.expense.findMany({
            where: {
                organizationId,
                expenseDate: range
            },
            select: { amount: true, category: { select: { name: true } } }
        })
    ]);

    const revenueMap = {};
    invoices.forEach((invoice) => {
        const date = invoice.createdAt.toISOString().split('T')[0];
        revenueMap[date] = (revenueMap[date] || 0) + invoice.totalAmount;
    });

    const expensesByCategory = new Map();
    expenses.forEach((expense) => {
        const category = expense.category?.name || 'Uncategorized';
        expensesByCategory.set(
            category,
            (expensesByCategory.get(category) || 0) + expense.amount
        );
    });

    return {
        revenueData: Object.keys(revenueMap).sort().map((date) => ({
            date,
            amount: revenueMap[date]
        })),
        expenseCategories: Array.from(expensesByCategory, ([name, total]) => ({
            name,
            total
        }))
    };
};

const getDashboardSummary = async (organizationId, startDate, endDate) => {
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
        prisma.product.count({ where: { organizationId } }),
        prisma.product.count({
            where: {
                organizationId,
                stock: { lte: 10 }
            }
        }),
        prisma.salesOrder.count({ where: { organizationId } }),
        prisma.invoice.findMany({
            where: { organizationId },
            select: { totalAmount: true, paidAmount: true, status: true }
        }),
        prisma.payment.aggregate({
            where: { organizationId },
            _sum: { amount: true }
        }),
        prisma.expense.aggregate({
            where: { organizationId },
            _sum: { amount: true }
        }),
        prisma.customer.count({ where: { organizationId } }),
        prisma.employee.count({ where: { organizationId } })
    ]);

    const totalRevenue = paidInvoices._sum.amount || 0;
    const totalExpenseAmount = totalExpenses._sum.amount || 0;
    const netProfit = totalRevenue - totalExpenseAmount;

    const reportRange = getReportDateRange(startDate, endDate);
    const chartData = await getDashboardChartData(
        organizationId,
        reportRange.start,
        reportRange.end
    );

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
        },
        ...chartData
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
