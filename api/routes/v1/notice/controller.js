const asyncHandler = require('express-async-handler');
const { cloneDeep } = require('lodash');
const { Notice, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { FORBIDDEN, NOTICE_NOT_FOUND } = require('../../../../shared/errors');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');

const getNotices = asyncHandler(async (req, res, next) => {
  const { query } = req;
  const documents = await Notice.search(query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getNotice = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await Notice.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate('attachments');

  if (!doc) return next(NOTICE_NOT_FOUND);
  if (doc.access.length > 0 && !hasRoles(user, ...doc.access)) return next(FORBIDDEN);
  if (!user || !hasRoles(user, 'admin', 'operator')) {
    doc.hits++;
    doc.save();
  }

  res.json(createResponse(res, doc));
});

const createNotice = asyncHandler(async (req, res, next) => {
  const { user } = req;
  const body = cloneDeep(req.body);

  body.writer = user.info;
  body.attachments = (body.attachments || []).map(a => a._id);

  const doc = await Notice.create(body);
  const urls = [
    ...findImageUrlsFromHtml(req.body.content || ''),
    ...(req.body.attachments || []).map(a => a.url)
  ];

  await updateFiles(req, doc._id, 'Notice', urls);
  res.json(createResponse(res, doc));
});

const updateNotice = asyncHandler(async (req, res, next) => {
  const { params: { id }, body } = req;
  const $set = cloneDeep(body);

  $set.attachments = ($set.attachments || []).map(a => a._id);

  const doc = await Notice.findById(id);

  if (!doc) return next(NOTICE_NOT_FOUND);

  const urls = [
    ...findImageUrlsFromHtml(body.content || ''),
    ...(body.attachments || []).map(a => a.url)
  ];

  await Promise.all([
    doc.updateOne({ $set }),
    updateFiles(req, doc._id, 'Notice', urls)
  ]);
  res.json(createResponse(res));
});

const removeNotice = asyncHandler(async (req, res, next) => {
  const { params: { id } } = req;
  const doc = await Notice.findById(id);

  if (!doc) return next(NOTICE_NOT_FOUND);

  const urls = [
    ...findImageUrlsFromHtml(doc.content || ''),
    ...(doc.attachments || []).map(a => a.url)
  ];

  await Promise.all([
    doc.deleteOne(),
    removeFilesByUrls(req, urls)
  ]);

  res.json(createResponse(res));
});

exports.getNotices = getNotices;
exports.getNotice = getNotice;
exports.createNotice = createNotice;
exports.updateNotice = updateNotice;
exports.removeNotice = removeNotice;
