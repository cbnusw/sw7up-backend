const asyncHandler = require('express-async-handler');
const { PressRelease, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  PRESS_RELEASE_NOT_FOUND
} = require('../../../../shared/errors');

const getPressReleases = asyncHandler(async (req, res, next) => {
  const { query } = req;
  const documents = await PressRelease.search(query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getPressRelease = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await PressRelease.findById(id).populate({ path: 'writer', model: UserInfo });

  if (!doc) return next(PRESS_RELEASE_NOT_FOUND);
  if (!user || !hasRoles(user, 'admin', 'operator')) {
    doc.hits++;
    doc.save();
  }

  res.json(createResponse(res, doc));
});

const createPressRelease = asyncHandler(async (req, res, next) => {
  const { body, user } = req;
  body.writer = user.info;

  const doc = await PressRelease.create(body);
  const urls = findImageUrlsFromHtml(body.content);

  await updateFiles(req, doc._id, 'PressRelease', urls);

  res.json(createResponse(res, doc));
});

const updatePressRelease = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: $set } = req;
  const doc = await PressRelease.findById(id);

  if (!doc) return next(PRESS_RELEASE_NOT_FOUND);

  const urls = findImageUrlsFromHtml($set.content);

  await Promise.all([
    doc.updateOne({ $set }),
    updateFiles(req, doc._id, 'PressRelease', urls)
  ]);

  res.json(createResponse(res));
});

const removePressRelease = asyncHandler(async (req, res, next) => {
  const { params: { id } } = req;
  const doc = await PressRelease.findById(id);

  if (!doc) return next(PRESS_RELEASE_NOT_FOUND);

  const urls = findImageUrlsFromHtml(doc.content);

  await Promise.all([doc.deleteOne(), removeFilesByUrls(req, urls)]);

  res.json(createResponse(res));
});

exports.getPressReleases = getPressReleases;
exports.getPressRelease = getPressRelease;
exports.createPressRelease = createPressRelease;
exports.updatePressRelease = updatePressRelease;
exports.removePressRelease = removePressRelease;
