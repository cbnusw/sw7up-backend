const { Router } = require('express');
const { isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/projects', controller.getProjectLanguages);
router.get('/filters', ...isOperator, controller.searchFilters);

router.post('/filters', ...isOperator, controller.createFilter);

router.delete('/filters/:id', ...isOperator, controller.removeFilter);

module.exports = router;
