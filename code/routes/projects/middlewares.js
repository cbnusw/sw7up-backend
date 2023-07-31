const { PROJECT_ID_REQUIRED, LOGIN_REQUIRED, FORBIDDEN, USER_INFO_NOT_FOUND } = require('../../../shared/errors');
const { createUpload } = require('../../services/file.service');
const asyncHandler = require('express-async-handler');
const { PROJECT_NOT_FOUND, FILE_NOT_UPLOADED } = require('../../../shared/errors');
const { Project, ProjectFile, Student, UserInfo } = require('../../../shared/models');
const mime = require('mime');
const { createResponse } = require('../../../shared/utils/response');
const { OPERATOR_ROLES } = require('../../../shared/constants');

const accessible = async (req, res, next) => {
  const { params: { no }, userNo, user } = req;
  
  if (!user) return next(LOGIN_REQUIRED);
  if (user.role === 'student') {
    if (no !== userNo) return next(FORBIDDEN);
  } else if (user.role === 'staff') {
    const student = await Student.findOne({ no }).populate({ path: 'professor', select: 'no' });
    if (!student || student.professor?.no !== userNo) return next(FORBIDDEN);
  } else if (!OPERATOR_ROLES.includes(user.role)) {
    next(FORBIDDEN);
  }
  
  next();
};

const noToId = async (req, res, next) => {
  const { params: { no } } = req;
  const { _id } = await UserInfo.findOne({ no }).lean() || {};
  
  if (!_id) return next(USER_INFO_NOT_FOUND);
  
  req.studentId = _id;
  next();
};

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

exports.accessible = asyncHandler(accessible);
exports.noToId = asyncHandler(noToId);
exports.createSingleUpload = createSingleUpload;
exports.createArrayUpload = createArrayUpload;
exports.createProjectFilesResponse = createProjectFilesResponse;
