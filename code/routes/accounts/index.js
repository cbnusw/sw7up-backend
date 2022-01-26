const { Router } = require('express');
const { isAuthenticated } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', isAuthenticated, controller.searchAccounts);
router.get('/:id', isAuthenticated, controller.getAccount);

module.exports = router;
