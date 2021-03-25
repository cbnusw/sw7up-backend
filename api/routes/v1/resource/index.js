const { Router } = require('express');
const { isAuthenticated, hasPermission } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getResources);
router.get('/:id', isAuthenticated, controller.getResource);
router.post('/', ...hasPermission('resource'), controller.createResource);
router.put('/:id', ...hasPermission('resource'), controller.updateResource);
router.delete('/:id', ...hasPermission('resource'), controller.removeResource);

module.exports = router;
