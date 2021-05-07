const asyncHandler = require('express-async-handler');
const { CorruptionReport, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasPermission } = require('../../../../shared/utils/permission');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  CORRUPTION_REPORT_NOT_FOUND,
  FORBIDDEN,
  REPLY_NOT_FOUND,
} = require('../../../../shared/errors');

const getCorruptionReports = asyncHandler(async (req, res, next) => {
  const { query, user } = req;
  const condition = {};
  if (!hasPermission(user, 'corruption report')) condition.writer = user.info;

  const documents = await CorruptionReport.search(query, condition, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getCorruptionReport = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await CorruptionReport.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate({ path: 'replies.writer', model: UserInfo })
    .populate({ path: 'replies.replies.writer', model: UserInfo });

  if (!doc) return next(CORRUPTION_REPORT_NOT_FOUND);
  if (!hasPermission(user, 'corruption report') && String(doc.writer._id) !== String(user.info))
    return next(FORBIDDEN);

  res.json(createResponse(res, doc));
});

const createCorruptionReport = asyncHandler(async (req, res, next) => {
  const { body, user } = req;
  body.writer = user.info;

  const urls = findImageUrlsFromHtml(body.content);
  const doc = await CorruptionReport.create(body);
  await updateFiles(req, doc._id, 'CorruptionReport', urls);
  res.json(createResponse(res, doc));
});

const addReply = asyncHandler(async (req, res, next) => {
  const { params: { id }, body, user } = req;
  body.writer = user.info;

  const doc = await CorruptionReport.findById(id);
  if (!doc) return next(CORRUPTION_REPORT_NOT_FOUND);
  if (!hasPermission(user, 'corruption report') && String(doc.writer) !== user.info) return next(FORBIDDEN);

  doc.replies = [...doc.replies, body];
  await doc.save();
  res.json(createResponse(res));
});

const updateCorruptionReport = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: $set, user } = req;
  const doc = await CorruptionReport.findById(id);

  if (String(doc.writer) !== String(user.info)) return next(FORBIDDEN);

  const urls = findImageUrlsFromHtml($set.content);

  await Promise.all([
    doc.updateOne({ $set }),
    updateFiles(req, doc._id, 'CorruptionReport', urls)
  ]);

  res.json(createResponse(res));
});

const updateReply = asyncHandler(async (req, res, next) => {
  const { params: { id, replyId }, body: { content }, user } = req;
  const doc = await CorruptionReport.findById(id);

  if (!doc) return next(CORRUPTION_REPORT_NOT_FOUND);
  if (String(doc.user) !== user.info && hasPermission(user, 'corruption report')) return next(FORBIDDEN);

  const reply = doc.replies.find(r => String(r._id) === String(replyId));

  if (!reply) return next(REPLY_NOT_FOUND);
  if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);

  reply.content = content;
  await doc.save();
  res.json(createResponse(res));
});

const removeCorruptionReport = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await CorruptionReport.findById(id);

  if (!doc) return next(CORRUPTION_REPORT_NOT_FOUND);
  if (!hasPermission(user, 'corruption report') && String(doc.writer) !== String(user.info))
    return next(FORBIDDEN);

  const urls = findImageUrlsFromHtml(doc.content);

  await Promise.all([doc.deleteOne(), removeFilesByUrls(req, urls)]);
  res.json(createResponse(res));
});

const removeReply = asyncHandler(async (req, res, next) => {
  const { params: { id, replyId }, user } = req;
  const doc = await CorruptionReport.findById(id);

  if (!doc) return next(CORRUPTION_REPORT_NOT_FOUND);

  const idx = doc.replies.findIndex(r => String(r._id) === String(replyId));

  if (idx === -1) return next(REPLY_NOT_FOUND);

  const reply = doc.replies[idx];

  if (String(reply.writer) !== String(user.info)) return next(FORBIDDEN);

  doc.replies.splice(idx, 1);
  await doc.save();
  res.json(createResponse(res));
});

exports.getCorruptionReports = getCorruptionReports;
exports.getCorruptionReport = getCorruptionReport;
exports.createCorruptionReport = createCorruptionReport;
exports.addReply = addReply;
exports.updateCorruptionReport = updateCorruptionReport;
exports.updateReply = updateReply;
exports.removeCorruptionReport = removeCorruptionReport;
exports.removeReply = removeReply;
