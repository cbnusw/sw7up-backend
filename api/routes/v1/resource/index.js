const { Router } = require('express');
const { isAuthenticated, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getResources);
router.get('/:id', isAuthenticated, controller.getResource);
router.post('/', ...isOperator, controller.createResource);
router.put('/:id', ...isOperator, controller.updateResource);
router.delete('/:id', ...isOperator, controller.removeResource);

module.exports = router;
