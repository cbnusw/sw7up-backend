const asyncHandler = require('express-async-handler');
const { Resource, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  RESOURCE_NOT_FOUND,
} = require('../../../../shared/errors');

const getResources = asyncHandler(async (req, res, next) => {
  const documents = await Resource.search(req.query, null, [{ path: 'writer', model: UserInfo }]);

  res.json(createResponse(res, documents));
});

const getResource = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const doc = await Resource.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate({ path: 'attachments' });

  res.json(createResponse(res, doc));
});

const createResource = asyncHandler(async (req, res, next) => {
  const resource = req.body;
  const urls = [
    ...resource.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(resource.content)
  ];

  resource.writer = req.user.info;
  resource.attachments = (resource.attachments || []).map(attachment => attachment._id);

  const data = await Resource.create(resource);
  await updateFiles(req, data._id, 'Resource', urls);

  res.json(createResponse(res, data));
});

const updateResource = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const $set = req.body;
  const doc = await Resource.findById(id);

  if (!doc) return next(RESOURCE_NOT_FOUND);

  const urls = [
    ...$set.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml($set.content)
  ];

  $set.attachments = $set.attachments.map(attachment => attachment._id);

  await Promise.all([
    doc.updateOne({ $set }),
    updateFiles(req, doc._id, 'Resource', urls)
  ]);

  res.json(createResponse(res));
});

const removeResource = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const data = await Resource.findById(id)
    .populate({ path: 'attachments', select: 'url' });

  if (!data) return next(RESOURCE_NOT_FOUND);

  const urls = [
    ...data.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(data.content)
  ];

  await Promise.all([
    data.deleteOne(),
    removeFilesByUrls(req, urls)
  ]);

  res.json(createResponse(res));
});

exports.getResources = getResources;
exports.getResource = getResource;
exports.createResource = createResource;
exports.updateResource = updateResource;
exports.removeResource = removeResource;
