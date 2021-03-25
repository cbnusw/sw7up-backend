const { Resource, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { findImageUrlsFromHtml, removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  RESOURCE_NOT_FOUND,
} = require('../../../../shared/errors');

const getResources = async (req, res, next) => {
  try {
    const documents = await Resource.search(req.query, null, [{ path: 'writer', model: UserInfo }]);
    res.json(createResponse(res, documents));
  } catch (e) {
    next(e);
  }
};

const getResource = async (req, res, next) => {
  const { id } = req.params;

  try {
    const doc = await Resource.findById(id)
      .populate({ path: 'writer', model: UserInfo })
      .populate({ path: 'attachments' });
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const createResource = async (req, res, next) => {
  const resource = req.body;
  const urls = [
    ...resource.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(resource.content)
  ];
  resource.writer = req.user.info;
  resource.attachments = (resource.attachments || []).map(attachment => attachment._id);

  try {
    const data = await Resource.create(resource);
    await updateFiles(req, data._id, 'Resource', urls);
    res.json(createResponse(res, data));
  } catch (e) {
    next(e);
  }
};

const updateResource = async (req, res, next) => {
  const { id } = req.params;
  const $set = req.body;

  try {
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
  } catch (e) {
    next(e);
  }
};

const removeResource = async (req, res, next) => {
  const { id } = req.params;

  try {
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
  } catch (e) {
    next(e);
  }
};

exports.getResources = getResources;
exports.getResource = getResource;
exports.createResource = createResource;
exports.updateResource = updateResource;
exports.removeResource = removeResource;
