const express = require('express');
const router = express.Router();
const employeesController = require('./employees.controller');
const employeesValidator = require('./employees.validator');
const { requireAuth } = require('../../middleware/authMiddleware');
const { resolveTenant } = require('../../middleware/tenantResolver');
const { requirePermission } = require('../../middleware/rbacMiddleware');

router.use(requireAuth);
router.use(resolveTenant);

// Departments
router.get('/departments', requirePermission('employees:read'), employeesController.getDepartments);
router.post('/departments', requirePermission('employees:write'), employeesValidator.createDepartment, employeesController.createDepartment);
router.delete('/departments/:id', requirePermission('employees:write'), employeesController.deleteDepartment);

// Employees
router.get('/', requirePermission('employees:read'), employeesController.getEmployees);
router.get('/:id', requirePermission('employees:read'), employeesController.getEmployeeById);
router.post('/', requirePermission('employees:write'), employeesValidator.createEmployee, employeesController.createEmployee);
router.put('/:id', requirePermission('employees:write'), employeesValidator.updateEmployee, employeesController.updateEmployee);
router.delete('/:id', requirePermission('employees:write'), employeesController.deleteEmployee);

module.exports = router;
