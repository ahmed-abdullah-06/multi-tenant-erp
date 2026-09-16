const employeesService = require('./employees.service');
const { successResponse } = require('../../lib/response');

const getDepartments = async (req, res, next) => {
    try {
        const departments = await employeesService.getDepartments(req.tenantId);
        return successResponse(res, 200, 'Departments retrieved', departments);
    } catch (error) {
        next(error);
    }
};

const createDepartment = async (req, res, next) => {
    try {
        const department = await employeesService.createDepartment(req.tenantId, req.body);
        return successResponse(res, 201, 'Department created successfully', department);
    } catch (error) {
        next(error);
    }
};

const deleteDepartment = async (req, res, next) => {
    try {
        await employeesService.deleteDepartment(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Department deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const getEmployees = async (req, res, next) => {
    try {
        const employees = await employeesService.getEmployees(req.tenantId);
        return successResponse(res, 200, 'Employees retrieved', employees);
    } catch (error) {
        next(error);
    }
};

const getEmployeeById = async (req, res, next) => {
    try {
        const employee = await employeesService.getEmployeeById(req.tenantId, req.params.id);
        if (!employee) return res.status(404).json({ error: 'Employee not found' });
        return successResponse(res, 200, 'Employee retrieved', employee);
    } catch (error) {
        next(error);
    }
};

const createEmployee = async (req, res, next) => {
    try {
        const employee = await employeesService.createEmployee(req.tenantId, req.body);
        return successResponse(res, 201, 'Employee created successfully', employee);
    } catch (error) {
        next(error);
    }
};

const updateEmployee = async (req, res, next) => {
    try {
        await employeesService.updateEmployee(req.tenantId, req.params.id, req.body);
        return successResponse(res, 200, 'Employee updated successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
};

const deleteEmployee = async (req, res, next) => {
    try {
        await employeesService.deleteEmployee(req.tenantId, req.params.id);
        return successResponse(res, 200, 'Employee deleted successfully');
    } catch (error) {
        if (error.message.includes('not found')) return res.status(404).json({ error: error.message });
        next(error);
    }
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
