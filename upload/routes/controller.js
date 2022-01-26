const asyncHandler = require('express-async-handler');
const { parse } = require('url');
const { join, basename } = require('path');
const { createResponse } = require('../../shared/utils/response');
const { hasRoles } = require('../../shared/utils/permission');
const { File } = require('../../shared/models/@main');
const { removeFileByUrl: _removeFileByUrl, removeFileById: _removeFileById } = require('../../shared/utils/file');
const {
  ROOT_DIR,
  UPLOAD_APP_HOST,
  UPLOAD_DIR,
} = require('../../shared/env');
const {
  FILE_NOT_UPLOADED,
  FILE_NOT_FOUND,
  FORBIDDEN,
} = require('../../shared/errors');

const uploadMiddleware = asyncHandler(async (req, res, next) => {
  if (!req.file) return next(FILE_NOT_UPLOADED);

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
});

const download = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const file = await File.findById(id);
  if (!file) return next(FILE_NOT_FOUND);
  if (!file.access.includes('nonmember') && !hasRoles(req.user, ...file.access)) return next(FORBIDDEN);
  const filePath = join(ROOT_DIR, UPLOAD_DIR, basename(parse(file.url).pathname));

  res.download(filePath, file.filename);
});

const uploadFile = asyncHandler(async (req, res, next) => {
  const { file: data } = req;
  const { url } = data;

  res.json({ uploaded: true, url, error: null, data });
});

const removeFileByUrl = asyncHandler(async (req, res, next) => {
  const { url } = req.query;

  await _removeFileByUrl(req, url);
  res.json(createResponse(res));
});

const removeFileById = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  await _removeFileById(req, id);
  res.json(createResponse(res));
});

exports.download = download;
exports.uploadMiddleware = uploadMiddleware;
exports.upload = uploadFile;
exports.removeFileByUrl = removeFileByUrl;
exports.removeFileById = removeFileById;
