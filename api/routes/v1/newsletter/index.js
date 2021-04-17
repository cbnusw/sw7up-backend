const { Router } = require('express');
const { authenticate, isOperator } = require('../../../../shared/middlewares/auth');
const controller = require('./controller');
const { upload } = require('./service');

const router = Router();

router.get('/', controller.getNewsletters);
router.get('/:id', authenticate, controller.getNewsletter);

router.post('/',
  ...isOperator,
  upload.single('file'),
  controller.unzip,
  controller.createNewsletter
);

router.delete('/:id', ...isOperator, controller.removeNewsletter);

module.exports = router;
