const prisma = require('../../lib/prisma');

// Departments
const getDepartments = async (tenantId) => {
    return await prisma.department.findMany({
        where: { organizationId: tenantId },
        include: { _count: { select: { employees: true } } }
    });
};

const createDepartment = async (tenantId, { name, code, description }) => {
    return await prisma.department.create({
        data: {
            organizationId: tenantId,
            name,
            code,
            description
        }
    });
};

const deleteDepartment = async (tenantId, id) => {
    const result = await prisma.department.deleteMany({
        where: { id, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Department not found or access denied');
    return result;
};

// Employees
const getEmployees = async (tenantId) => {
    return await prisma.employee.findMany({
        where: { organizationId: tenantId },
        include: { department: true }
    });
};

const getEmployeeById = async (tenantId, employeeId) => {
    return await prisma.employee.findFirst({
        where: { id: employeeId, organizationId: tenantId },
        include: { department: true }
    });
};

const createEmployee = async (tenantId, employeeData) => {
    return await prisma.employee.create({
        data: {
            ...employeeData,
            organizationId: tenantId
        },
        include: { department: true }
    });
};

const updateEmployee = async (tenantId, employeeId, updateData) => {
    const result = await prisma.employee.updateMany({
        where: { id: employeeId, organizationId: tenantId },
        data: updateData
    });
    if (result.count === 0) throw new Error('Employee not found or access denied');
    return result;
};

const deleteEmployee = async (tenantId, employeeId) => {
    const result = await prisma.employee.deleteMany({
        where: { id: employeeId, organizationId: tenantId }
    });
    if (result.count === 0) throw new Error('Employee not found or access denied');
    return result;
};

module.exports = {
    getDepartments,
    createDepartment,
    deleteDepartment,
    getEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee
};
