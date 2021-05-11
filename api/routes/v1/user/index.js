const { Router } = require('express');
const { isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/member', ...isOperator, controller.getMembers);
router.get('/student', ...isOperator, controller.getStudents);
router.get('/staff', ...isOperator, controller.getStaffs);
router.get('/operator', ...isOperator, controller.getOperators);
router.get('/student/:id', ...isOperator, controller.getStudent);
router.get('/staff/:id', ...isOperator, controller.getStaff);
router.get('/operator/:id', ...isOperator, controller.getOperator);

router.post('/student', ...isOperator, controller.registerStudent);
router.post('/staff', ...isOperator, controller.registerStaff);
router.post('/operator', ...isOperator, controller.registerOperator);
router.post('/:id/restore', ...isOperator, controller.restore);

router.put('/student/:id', ...isOperator, controller.updateStudent);
router.put('/staff/:id', ...isOperator, controller.updateStaff);
router.put('/operator/:id', ...isOperator, controller.updateOperator);

router.patch('/:id/permissions', ...isOperator, controller.setPermissions);
router.patch('/:id/admin/change', ...isOperator, controller.changeRole('admin'));
router.patch('/:id/operator/change', ...isOperator, controller.changeRole('operator'));

router.delete('/clear', ...isOperator, controller.clear);
router.delete('/:id', ...isOperator, controller.removeUser);
router.delete('/:id/clear', ...isOperator, controller.clearUser);

module.exports = router;
