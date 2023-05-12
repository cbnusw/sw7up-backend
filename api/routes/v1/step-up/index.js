const { Router } = require('express');
const controller = require('./controller');
const { isOperator, authenticate } = require('../../../../shared/middlewares/auth');

const router = Router();

router.get('/levels', controller.getLevels);
router.get('/levels/:id', controller.getLevel);
router.post('/levels', ...isOperator, controller.createLevel);
router.post('/levels/reorder', ...isOperator, controller.reorderLevels);
router.patch('/levels/:id/name', ...isOperator, controller.updateLevelName);
router.delete('/levels/:id', ...isOperator, controller.removeLevel);

router.get('/subjects', controller.getSubjects);
router.get('/subjects/:id/sequence', controller.getSubjectSequence);
router.post('/subjects', ...isOperator, controller.createSubject);
router.patch('/subjects/:id/name', ...isOperator, controller.updateSubjectName);
router.delete('/subjects/:id', ...isOperator, controller.removeSubject);

router.get('/contents', controller.getContents);
router.get('/contents/:id', authenticate, controller.getContent);
router.post('/contents', ...isOperator, controller.createContent);
router.put('/contents/:id', ...isOperator, controller.updateContent);
router.delete('/contents/:id', ...isOperator, controller.removeContent);

module.exports = router;
