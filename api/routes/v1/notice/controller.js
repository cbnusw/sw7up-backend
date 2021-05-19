const asyncHandler = require('express-async-handler');
const { cloneDeep } = require('lodash');
const { FORBIDDEN, NOTICE_NOT_FOUND } = require('../../../../shared/errors');
const { Notice, UserInfo } = require('../../../../shared/models');
const { toRegEx } = require('../../../../shared/models/mappers');
const { hasRoles } = require('../../../../shared/utils/permission');
const { createResponse } = require('../../../../shared/utils/response');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');

const getNotices = asyncHandler(async (req, res, next) => {
  const { query } = req;
  let { q, category, page, limit, sort } = query;

  const condition = {};
  const $or = [];

  if (category) condition.category = category;

  if (q) {
    const [, value] = q.split('=');
    const writers = await UserInfo.find({ name: toRegEx(value), role: { $in: ['admin', 'operator'] } });
    const $in = writers.map(writer => writer._id);
    const v = toRegEx(value);
    if (v !== undefined) {
      $or.push({ title: v });
      if (!category) $or.push({ category: v });
    }
    if ($in.length > 0) $or.push({ writer: $in });
  }

  const importantCondition = { ...condition };
  const now = new Date();

  importantCondition.important = true;
  importantCondition.period = { $gte: now };

  if ($or.length > 0) {
    condition.$and = [{ $or: [{ important: false }, { period: { $lt: now } }, { period: null }] }];
    condition.$and.push({ $or });
    importantCondition.$or = [...$or];
  } else {
    condition.$or = [{ important: false }, { period: { $lt: now } }, { period: null }]
  }

  let total = await Notice.countDocuments(condition);
  const importantTotal = await Notice.countDocuments(importantCondition);
  total += importantTotal;

  let skip, skipDiff, limitDiff, documents = [];
  let _query, _importantQuery;

  limit = +limit;

  if (!isNaN(limit) && limit > 0) {
    skip = +((page || 1) - 1) * limit;
    skipDiff = skip - importantTotal;
    limitDiff = limit + skipDiff;

    if (skipDiff <= 0) {
      _importantQuery = Notice.find(importantCondition)
        .populate({ path: 'writer', select: 'name', model: UserInfo })
        .skip(skip)
        .limit(limit);

      if (sort) _importantQuery.sort(sort);
    }

    if (limitDiff > 0) {
      _query = Notice.find(condition)
        .populate({ path: 'writer', select: 'name', model: UserInfo });
      if (limitDiff < limit) _query.limit(limitDiff)
      else _query.skip(skipDiff).limit(limit);

      if (sort) _query.sort(sort);
    }
  }

  if (_importantQuery) documents = [...await _importantQuery.exec()];
  if (_query) documents = [...documents, ...await _query.exec()];

  const data = {
    total,
    page,
    limit,
    documents
  };

  res.json(createResponse(res, data));
});

const getNotice = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await Notice.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate('attachments');

  if (!doc) return next(NOTICE_NOT_FOUND);
  if (!doc.access.includes('nonmember') && !hasRoles(user, ...doc.access)) return next(FORBIDDEN);
  if (!user || !hasRoles(user)) {
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
