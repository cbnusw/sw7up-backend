const { Router } = require('express');
const { authenticate, isOperator } = require('../../shared/middlewares/auth');
const { createUpload } = require('../../shared/utils/file');
const controller = require('./controller');

const upload = createUpload();

const router = Router();

router.get('/:id/download', authenticate, controller.download);

router.post(
  '/',
  ...isOperator,
  upload.single('upload'),
  controller.uploadMiddleware,
  controller.upload
);

router.delete('/', ...isOperator, controller.removeFileByUrl);
router.delete('/:id', ...isOperator, controller.removeFileById);

module.exports = router;
