const asyncHandler = require('express-async-handler');
const { ProjectAccount, ProjectTeam } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { hasRole } = require('../../../shared/utils/permission');
const { FORBIDDEN, PROJECT_TEAM_NOT_FOUND } = require('../../../shared/errors');

const searchTeams = async (req, res) => {
  const { query } = req;
  const data = await ProjectTeam.search(query);
  res.json(createResponse(res, data));
};

const searchMyTeams = async (req, res) => {
  const { query, user } = req;
  const data = await ProjectTeam.search(query, { creator: user.info });
  res.json(createResponse(res, data));
};

const getTeam = async (req, res) => {
  const { params: { id }, user } = req;
  const team = await ProjectTeam.findById(id)
    .populate({ path: 'members', select: 'no name department role' })
    .populate({ path: 'creator', select: 'no name department role' });

  if (!team) throw  PROJECT_TEAM_NOT_FOUND;
  if (!hasRole(user) && team.creator !== account._id) throw FORBIDDEN;

  res.json(createResponse(res, team));
};

const createTeam = async (req, res) => {
};

const updateTeam = async (req, res) => {
};

const addMember = async (req, res) => {
};

const removeMember = async (req, res) => {
};

const removeTeam = async (req, res) => {
};

exports.searchTeams = asyncHandler(searchTeams);
exports.searchMyTeams = asyncHandler(searchMyTeams);
exports.getTeam = asyncHandler(getTeam);
exports.createTeam = asyncHandler(createTeam);
exports.updateTeam = asyncHandler(updateTeam);
exports.addMember = asyncHandler(addMember);
exports.removeMember = asyncHandler(removeMember);
exports.removeTeam = asyncHandler(removeTeam);
