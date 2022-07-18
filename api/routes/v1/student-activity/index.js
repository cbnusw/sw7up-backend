const { Router } = require('express');
const controller = require('./controller');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');

const router = Router();

router.get('/', controller.getStudentActivities);
router.get('/:id', authenticate, controller.getStudentActivity);
router.post('/', ...isOperator, controller.createStudentActivity);
router.put('/:id', ...isOperator, controller.updateStudentActivity);
router.delete('/:id', ...isOperator, controller.removeStudentActivity);

module.exports = router;
