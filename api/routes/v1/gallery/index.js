const { Router } = require('express');
const { authenticate, hasPermission } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getGalleries);
router.get('/:id', authenticate, controller.getGallery);
router.post('/', ...hasPermission('gallery'), controller.createGallery);
router.put('/:id', ...hasPermission('gallery'), controller.updateGallery);
router.delete('/:id', ...hasPermission('gallery'), controller.removeGallery);

module.exports = router;
