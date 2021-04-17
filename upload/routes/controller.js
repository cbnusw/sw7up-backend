const { parse } = require('url');
const { join, basename } = require('path');
const { createResponse } = require('../../shared/utils/response');
const { hasSomeRoles } = require('../../shared/utils/permission');
const { File } = require('../../shared/models/@main');
const { removeFileByUrl: _removeFileByUrl, removeFileById: _removeFileById } = require('../../shared/utils/file');
const {
  ROOT_DIR,
  UPLOAD_APP_HOST,
  UPLOAD_DIR,
} = require('../../shared/env');
const {
  FAIL_FILE_UPLOAD,
  FILE_NOT_FOUND,
  FORBIDDEN,
} = require('../../shared/errors');

const uploadMiddleware = async (req, res, next) => {
  if (!req.file) return next(FAIL_FILE_UPLOAD);

  const { access = [] } = req.body || req.query || {};

  req.file = await File.create({
    url: `${UPLOAD_APP_HOST}/${req.file.filename}`,
    filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    access,
    uploader: req.user.info
  });

  next();
};

const download = async (req, res, next) => {
  const { id } = req.params;

  const file = await File.findById(id);
  if (!file) return next(FILE_NOT_FOUND);
  if (file.access.length > 0 && !hasSomeRoles(req.user, ...file.access)) return next(FORBIDDEN);
  const filePath = join(ROOT_DIR, UPLOAD_DIR, basename(parse(file.url).pathname));

  res.download(filePath, file.filename);
};

const uploadFile = async (req, res, next) => {
  const { file: data } = req;
  const { url } = data;

  try {
    res.json({ uploaded: true, url, error: null, data });
  } catch (e) {
    next(e);
  }
};

const removeFileByUrl = async (req, res, next) => {
  const { url } = req.query;
  try {
    await _removeFileByUrl(req, url);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

const removeFileById = async (req, res, next) => {
  const { id } = req.params;

  try {
    await _removeFileById(req, id);
    res.json(createResponse(res));
  } catch (e) {
    next(e);
  }
};

exports.download = download;
exports.uploadMiddleware = uploadMiddleware;
exports.upload = uploadFile;
exports.removeFileByUrl = removeFileByUrl;
exports.removeFileById = removeFileById;
