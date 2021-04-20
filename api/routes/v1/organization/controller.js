const { createResponse } = require('../../../../shared/utils/response');
const { Organization } = require('../../../../shared/models');
const {
  NOT_FOUND
} = require('../../../../shared/errors');

const getOrganization = async (req, res, next) => {
  try {
    const doc = await Organization.findOne();
    if (!doc) return next(NOT_FOUND);

    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const updateOrganization = async (req, res, next) => {
  const { body: $set } = req;

  try {
    const doc = await Organization.findOne();
    if (!doc) return next(NOT_FOUND);
    await doc.updateOne({ $set });
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

exports.getOrganization = getOrganization;
exports.updateOrganization = updateOrganization;
