const { Router } = require('express');
const { isAuthenticated, isStudent, isOperator } = require('../../../shared/middlewares/auth');
const controller = require('./controller');

const router = Router();

router.get('/', ...isOperator, controller.searchTeams);
// router.get('/me', ...isStudent, controller.searchMyTeams);
// router.get('/:id', isAuthenticated, controller.getTeam);
//
// router.post('/', ...isStudent, controller.createTeam);
// router.put('/:id', ...isStudent, controller.updateTeam);
//
// router.patch('/:id/members/:userId/add', ...isStudent, controller.addMember);
// router.patch('/:id/members/:userId/remove', ...isStudent, controller.removeMember);
//
// router.delete('/:id', isAuthenticated, controller.removeTeam);


module.exports = router;
