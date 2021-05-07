const asyncHandler = require('express-async-handler');
const { createResponse } = require('../../../../shared/utils/response');
const { Organization } = require('../../../../shared/models');
const {
  NOT_FOUND
} = require('../../../../shared/errors');

const getOrganization = asyncHandler(async (req, res, next) => {
  const doc = await Organization.get();
  if (!doc) return next(NOT_FOUND);

  res.json(createResponse(res, doc));
});

const updateOrganization = asyncHandler(async (req, res, next) => {
  const { body: $set } = req;
  const doc = await Organization.get();

  if (!doc) return next(NOT_FOUND);

  await doc.updateOne({ $set });

  res.json(createResponse(res));
});

exports.getOrganization = getOrganization;
exports.updateOrganization = updateOrganization;
