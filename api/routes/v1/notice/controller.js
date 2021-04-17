const { cloneDeep } = require('lodash');
const { Notice, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasSomeRoles } = require('../../../../shared/utils/permission');
const { FORBIDDEN, NOTICE_NOT_FOUND } = require('../../../../shared/errors');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');

const getNotices = async (req, res, next) => {
  const { query } = req;
  try {
    const documents = await Notice.search(query, null, [{ path: 'writer', model: UserInfo }]);
    res.json(createResponse(res, documents));
  } catch (e) {
    next(e);
  }
};

const getNotice = async (req, res, next) => {
  const { params: { id }, user } = req;

  try {
    const doc = await Notice.findById(id)
      .populate({ path: 'writer', model: UserInfo })
      .populate('attachments');

    if (!doc) return next(NOTICE_NOT_FOUND);
    if (doc.access.length > 0 && !hasSomeRoles(user, ...doc.access)) return next(FORBIDDEN);

    if (!user || !hasSomeRoles(user, 'admin', 'operator')) {
      doc.hits++;
      doc.save();
    }

    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const createNotice = async (req, res, next) => {
  const { user } = req;
  const body = cloneDeep(req.body);
  body.writer = user.info;
  body.attachments = (body.attachments || []).map(a => a._id);

  try {
    const doc = await Notice.create(body);
    const urls = [
      ...findImageUrlsFromHtml(req.body.content || ''),
      ...(req.body.attachments || []).map(a => a.url)
    ];
    await updateFiles(req, doc._id, 'Notice', urls);
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const updateNotice = async (req, res, next) => {
  const { params: { id }, body } = req;
  const $set = cloneDeep(body);
  $set.attachments = ($set.attachments || []).map(a => a._id);

  try {
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
  } catch (e) {
    next(e);
  }
};

const removeNotice = async (req, res, next) => {
  const { params: { id } } = req;

  try {
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
  } catch (e) {
    next(e);
  }
};

exports.getNotices = getNotices;
exports.getNotice = getNotice;
exports.createNotice = createNotice;
exports.updateNotice = updateNotice;
exports.removeNotice = removeNotice;
