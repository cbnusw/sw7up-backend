const { Gallery, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { removeFilesByUrls, updateFiles } = require('../../../../shared/utils/file');
const {
  GALLERY_NOT_FOUND,
} = require('../../../../shared/errors');

const getGalleries = async (req, res, next) => {
  const { query } = req;
  try {
    const documents = await Gallery.search(query, null, [{ path: 'writer', model: UserInfo }]);
    res.json(createResponse(res, documents));
  } catch (e) {
    next(e);
  }
};

const getGallery = async (req, res, next) => {
  const { params: { id }, user } = req;

  try {
    const doc = await Gallery.findById(id).populate({ path: 'writer', model: UserInfo });
    if (!doc) return next(GALLERY_NOT_FOUND);

    if (!user || !hasRoles(user, 'admin', 'operator')) {
      doc.hits++;
      doc.save();
    }

    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const createGallery = async (req, res, next) => {
  const { body, user } = req;
  body.writer = user.info;

  try {
    const urls = body.pictures.map(picture => picture.url);
    const doc = await Gallery.create(body);
    await updateFiles(req, doc._id, 'Gallery', urls);
    res.json(createResponse(res, doc));
  } catch (e) {
    next(e);
  }
};

const updateGallery = async (req, res, next) => {
  const { params: { id }, body: $set } = req;
  const urls = $set.pictures.map(picture => picture.url);

  try {
    const doc = await Gallery.findById(id);
    if (!doc) return next(GALLERY_NOT_FOUND);
    await Promise.all([doc.updateOne({ $set }), updateFiles(req, doc._id, 'Gallery', urls)]);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const removeGallery = async (req, res, next) => {
  const { id } = req.params;

  try {
    const doc = await Gallery.findById(id);
    if (!doc) return next(GALLERY_NOT_FOUND);
    const urls = doc.pictures.map(picture => picture.url);
    await Promise.all([doc.deleteOne(), removeFilesByUrls(req, urls)]);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

exports.getGalleries = getGalleries;
exports.getGallery = getGallery;
exports.createGallery = createGallery;
exports.updateGallery = updateGallery;
exports.removeGallery = removeGallery;
