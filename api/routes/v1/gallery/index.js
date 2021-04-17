const { Router } = require('express');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', controller.getGalleries);
router.get('/:id', authenticate, controller.getGallery);
router.post('/', ...isOperator, controller.createGallery);
router.put('/:id', ...isOperator, controller.updateGallery);
router.delete('/:id', ...isOperator, controller.removeGallery);

module.exports = router;
