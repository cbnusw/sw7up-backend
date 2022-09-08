const asyncHandler = require('express-async-handler');
const mime = require('mime');
const { FILE_NOT_UPLOADED, PROJECT_ID_REQUIRED } = require('../../../shared/errors');
const { ProjectFile } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { createUpload } = require('../../services/file.service');

const createProjectFileUpload = (baseDir, useOriginalName = true) => (req, res, next) => {
  const { params: { id }, path } = req;
  const chunks = path.split('/').slice(3);
  const dirPath = chunks.join('/');
  if (!id) return next(PROJECT_ID_REQUIRED);
  const dir = `/code/static/projects/${id}${baseDir ? '/' + baseDir : ''}${dirPath ? '/' + dirPath : ''}`;
  const upload = createUpload(dir, useOriginalName);
  return upload.single('file')(req, res, next);
};

const createProjectFileResponse = baseDir => asyncHandler(async (req, res) => {
  const { params: { id }, file, user, path } = req;

  if (!file) throw FILE_NOT_FOUND;

  const chunks = path.split('/').slice(3);
  const dirPath = chunks.join('/');
  const document = await ProjectFile.create({
    path: `code-uploads/code/static/projects/${id}${baseDir ? '/' + baseDir : ''}${dirPath ? '/' + dirPath : ''}/${file.filename}`,
    name: file.originalname,
    type: file.type || mime.getType(file.originalname),
    size: file.size,
    temporary: true,
    creator: user.info,
  });

  res.json(createResponse(res, document, 201));
});

const sourceFileResponse = (req, res) => {
  const { file } = req;
  if (!file) throw FILE_NOT_UPLOADED;
  res.json(createResponse(res, file));
};

// const projectUpload = (req, res, next) => {
//   const { params: { id }, body: { path } } = req;
//   if (!id) return next(PROJECT_ID_REQUIRED);
//   const dir = `projects/${id}${path ? '/' : ''}${path ? path : ''}`;
//   const upload = createUpload(dir, true);
//   return upload.single('file')(req, res, next);
// };
//
// const bannerUpload = (req, res, next) => {
//
// };
//
// const fileMiddleware = async (req, res, next) => {
//   const { body: { path }, params: { id }, file, user } = req;
//   if (!file) next(FILE_NOT_FOUND);
//
//   const document = await CodeFile.create({
//     path: `projects/${id}${path ? '/' : ''}${path ? path : ''}/${file.filename}`,
//     name: file.filename,
//     size: file.size,
//     creator: user.info,
//   });
//
//   res.json(createResponse(res, document, 201));
// };

// exports.removeSourceDir = asyncHandler(removeSourceDir);
exports.createProjectFileUpload = createProjectFileUpload;
exports.createProjectFileResponse = createProjectFileResponse;
exports.sourceFileResponse = sourceFileResponse;
