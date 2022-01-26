const asyncHandler = require('express-async-handler');
const { Gallery, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  GALLERY_NOT_FOUND,
} = require('../../../../shared/errors');

const getGalleries = asyncHandler(async (req, res, next) => {
  const { query } = req;
  const documents = await Gallery.search(query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, documents));
});

const getGallery = asyncHandler(async (req, res, next) => {
  const { params: { id }, user } = req;
  const doc = await Gallery.findById(id).populate({ path: 'writer', model: UserInfo });

  if (!doc) return next(GALLERY_NOT_FOUND);
  if (!user || !hasRoles(user)) {
    doc.hits++;
    doc.save();
  }

  res.json(createResponse(res, doc));
});

const createGallery = asyncHandler(async (req, res, next) => {
  const { body, user } = req;
  body.writer = user.info;

  const urls = body.pictures.map(picture => picture.url);
  const doc = await Gallery.create(body);

  await updateFiles(req, doc._id, 'Gallery', urls);
  res.json(createResponse(res, doc));
});

const updateGallery = asyncHandler(async (req, res, next) => {
  const { params: { id }, body: $set } = req;
  const urls = $set.pictures.map(picture => picture.url);
  const doc = await Gallery.findById(id);
  
  if (!doc) return next(GALLERY_NOT_FOUND);
  await Promise.all([doc.updateOne({ $set }), updateFiles(req, doc._id, 'Gallery', urls)]);
  res.json(createResponse(res));
});

const removeGallery = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const doc = await Gallery.findById(id);

  if (!doc) return next(GALLERY_NOT_FOUND);

  const urls = doc.pictures.map(picture => picture.url);

  await Promise.all([doc.deleteOne(), removeFilesByUrls(req, urls)]);
  res.json(createResponse(res));
});

exports.getGalleries = getGalleries;
exports.getGallery = getGallery;
exports.createGallery = createGallery;
exports.updateGallery = updateGallery;
exports.removeGallery = removeGallery;
