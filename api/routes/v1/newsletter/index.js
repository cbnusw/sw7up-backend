const { Router } = require('express');
const { authenticate, hasPermission } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');
const { upload } = require('./service');

const router = Router();

router.get('/', controller.getNewsletters);
router.get('/:id', authenticate, controller.getNewsletter);

router.post('/',
  ...hasPermission('newsletter'),
  upload.single('file'),
  controller.unzip,
  controller.createNewsletter
);

router.delete('/:id', ...hasPermission('newsletter'), controller.removeNewsletter);

module.exports = router;
