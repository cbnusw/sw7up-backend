const { Router } = require('express');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getOverseasEducations);
router.get('/:id', authenticate, controller.getOverseasEducation);
router.post('/', ...isOperator, controller.createOverseasEducation);
router.put('/:id', ...isOperator, controller.updateOverseasEducation);
router.delete('/:id', ...isOperator, controller.removeOverseasEducation);

module.exports = router;
