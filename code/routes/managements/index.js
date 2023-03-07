const { Router } = require('express');
const { isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/projects', isOperator, controller.getProjects);
router.get('/projects/download', isOperator, controller.downloadProjects);
// router.get('/projects', controller.getProjects);
// router.get('/projects/download', controller.downloadProjects);

module.exports = router;
