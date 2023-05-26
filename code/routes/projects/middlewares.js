const { PROJECT_ID_REQUIRED } = require('../../../shared/errors');
const { createUpload } = require('../../services/file.service');
const asyncHandler = require('express-async-handler');
const { PROJECT_NOT_FOUND, FILE_NOT_UPLOADED } = require('../../../shared/errors');
const { Project, ProjectFile } = require('../../../shared/models');
const mime = require('mime');
const { createResponse } = require('../../../shared/utils/response');

const createProjectUpload = (id, path, baseDir, useOriginalName) => {
  const chunks = decodeURI(path).split('/').slice(3);
  const dirPath = chunks.join('/');
  if (!id) throw PROJECT_ID_REQUIRED;
  const dir = `/code/static/projects/${id}${baseDir ? '/' + baseDir : ''}${dirPath ? '/' + dirPath : ''}`;
  return createUpload(dir, useOriginalName);
};

const createSingleUpload = (baseDir, useOriginalName = false) => (req, res, next) => {
  const { params: { id }, path } = req;
  try {
    const upload = createProjectUpload(id, path, baseDir, useOriginalName);
    return upload.single('file')(req, res, next);
  } catch (e) {
    next(e);
  }
};

const createArrayUpload = (baseDir, useOriginalName = false) => (req, res, next) => {
  const { params: { id }, path } = req;
  try {
    const upload = createProjectUpload(id, path, baseDir, useOriginalName);
    return upload.array('files')(req, res, next);
  } catch (e) {
    next(e);
  }
};

const createProjectFilesResponse = fileType => asyncHandler(async (req, res) => {
  const { params: { id }, files, user, path } = req;
  
  const project = await Project.findById(id);
  
  if ((files || []).length === 0) throw FILE_NOT_UPLOADED;
  if (!project) throw PROJECT_NOT_FOUND;
  
  const chunks = path.split('/').slice(2);
  const dirPath = chunks.join('/');
  const documents = await Promise.all(files.map(file => ProjectFile.create({
    path: `code-uploads/code/static/projects/${id}/${dirPath}/${file.filename}`,
    name: file.originalname,
    type: file.type || mime.getType(file.originalname),
    project: id,
    fileType,
    size: file.size,
    creator: user.info,
  })));
  
  res.json(createResponse(res, documents, 201));
});

exports.createSingleUpload = createSingleUpload;
exports.createArrayUpload = createArrayUpload;
exports.createProjectFilesResponse = createProjectFilesResponse;
