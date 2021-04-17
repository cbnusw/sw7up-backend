const { Router } = require('express');
const { hasPermission, hasSomePermissions, isAdmin } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/student', ...hasPermission('student'), controller.getStudents);
router.get('/staff', ...hasPermission('staff'), controller.getStaffs);
router.get('/operator', ...hasPermission('operator'), controller.getOperators);
router.get('/student/:id', ...hasPermission('student'), controller.getStudent);
router.get('/staff/:id', ...hasPermission('staff'), controller.getStaff);
router.get('/operator/:id', ...hasPermission('operator'), controller.getOperator);

router.post('/student', ...hasPermission('student'), controller.registerStudent);
router.post('/staff', ...hasPermission('staff'), controller.registerStaff);
router.post('/operator', ...hasPermission('operator'), controller.registerOperator);
router.post('/:id/restore', ...isAdmin, controller.restore);

router.put('/student/:id', ...hasPermission('student'), controller.updateStudent);
router.put('/staff/:id', ...hasPermission('staff'), controller.updateStaff);
router.put('/operator/:id', ...hasPermission('operator'), controller.updateOperator);

router.patch('/:id/permissions', ...isAdmin, controller.setPermissions);
router.patch('/:id/admin/add', ...isAdmin, controller.addAdminRole);
router.patch('/:id/admin/remove', ...isAdmin, controller.removeAdminRole);
router.patch('/:id/operator/add', ...hasSomePermissions('student', 'staff', 'operator'), controller.addOperatorRole);
router.patch('/:id/operator/remove', ...hasSomePermissions('student', 'staff', 'operator'), controller.removeOperatorRole);

router.delete('/clear', ...isAdmin, controller.clear);
router.delete('/:id', ...isAdmin, controller.removeUser);
router.delete('/:id/clear', ...isAdmin, controller.clearUser);

module.exports = router;
