const asyncHandler = require('express-async-handler');
const { UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { USER_INFO_NOT_FOUND } = require('../../../shared/errors');
const { unidentify } = require('../../services/security.service');
const { hasRole } = require('../../../shared/utils/permission');

const searchAccounts = async (req, res) => {
  const { query, user } = req;
  query.limit = query.limit || 10;
  const select = hasRole(user) ? '' : 'no name department role';
  const data = await UserInfo.search(query, { role: 'student' }, [], select);
  if (!hasRole(user)) data.documents = data.documents.map(unidentify);
  res.json(createResponse(res, data));
};


const getAccount = async (req, res) => {
  const { params: { id }, user } = req;
  const query = UserInfo.findById(id);
  let document;

  if (hasRole(user)) {
    document = await query;
  } else {
    document = await query.select('no name department role');
  }

  if (!document) throw USER_INFO_NOT_FOUND;

  res.json(createResponse(res, hasRole(user) ? document : unidentify(document)));

};

exports.searchAccounts = asyncHandler(searchAccounts);
exports.getAccount = asyncHandler(getAccount);
