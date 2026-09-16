const prisma = require('../../lib/prisma');

// Expense Categories
const getCategories = async (tenantId) => {
    return await prisma.expenseCategory.findMany({
        where: { organizationId: tenantId }
    });
};

const createCategory = async (tenantId, { name, description }) => {
    return await prisma.expenseCategory.create({
        data: { organizationId: tenantId, name, description }
    });
};

const deleteCategory = async (tenantId, categoryId) => {
    const result = await prisma.expenseCategory.deleteMany({
        where: { id: categoryId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Category not found or access denied');
    return result;
};

// Expenses
const getExpenses = async (tenantId) => {
    return await prisma.expense.findMany({
        where: { organizationId: tenantId },
        include: { category: true },
        orderBy: { expenseDate: 'desc' }
    });
};

const getExpenseById = async (tenantId, expenseId) => {
    return await prisma.expense.findFirst({
        where: { id: expenseId, organizationId: tenantId },
        include: { category: true }
    });
};

const createExpense = async (tenantId, data) => {
    return await prisma.expense.create({
        data: {
            organizationId: tenantId,
            categoryId: data.categoryId,
            amount: data.amount,
            payee: data.payee,
            description: data.description,
            status: data.status || 'PENDING',
            expenseDate: data.expenseDate ? new Date(data.expenseDate) : new Date()
        },
        include: { category: true }
    });
};

const updateExpense = async (tenantId, expenseId, data) => {
    const result = await prisma.expense.updateMany({
        where: { id: expenseId, organizationId: tenantId },
        data: {
            ...(data.categoryId && { categoryId: data.categoryId }),
            ...(data.amount !== undefined && { amount: data.amount }),
            ...(data.payee !== undefined && { payee: data.payee }),
            ...(data.description !== undefined && { description: data.description }),
            ...(data.status && { status: data.status })
        }
    });
    if (result.count === 0) throw new Error('Expense not found or access denied');
    return result;
};

const deleteExpense = async (tenantId, expenseId) => {
    const result = await prisma.expense.deleteMany({
        where: { id: expenseId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Expense not found or access denied');
    return result;
};

module.exports = {
    getCategories,
    createCategory,
    deleteCategory,
    getExpenses,
    getExpenseById,
    createExpense,
    updateExpense,
    deleteExpense
};
