const asyncHandler = require('express-async-handler');
const { StepUpLevel, StepUpSubject, StepUpContent, UserInfo } = require('../../../../shared/models');
const { STEP_UP_CONTENT_NOT_FOUND } = require('../../../../shared/errors');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { cloneDeep } = require('lodash');
const { findImageUrlsFromHtml, updateFiles, removeFilesByUrls } = require('../../../../shared/utils/file');

const getLevels = async (req, res) => {
  const levels = await StepUpLevel.find().sort({ order: 1 });
  res.json(createResponse(res, levels));
};

const createLevel = async (req, res) => {
  const { name } = req.body;
  const last = (await StepUpLevel.find().sort({ order: -1 }))[0];
  const order = (last?.order || 0) + 1;
  const document = await StepUpLevel.create({ name, order });
  res.json(createResponse(res, document));
};

const reorderLevels = async (req, res) => {
  await StepUpLevel.ordering(req.body);
  res.json(createResponse(res));
};

const updateLevelName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  
  await StepUpLevel.updateOne({ _id: id }, { $set: { name } });
  res.json(createResponse(res));
};

const removeLevel = async (req, res) => {
  const { id } = req.params;
  await StepUpLevel.deleteOne({ _id: id });
  // 하위 주제 및 콘텐츠 삭제 로직 추가(업로드된 파일도 삭제해야 함)
  res.json(createResponse(res));
};

const getSubjects = async (req, res) => {
  const { parent = null, level } = req.query;
  const condition = { level, parent: parent ?? { $eq: null } };
  
  const data = await StepUpSubject.find(condition);
  res.json(createResponse(res, data));
};

const getSubjectSequence = async (req, res) => {
  const { params: { id } } = req;
  const subjects = [];
  
  await unshift(id);
  res.json(createResponse(res, subjects));
  
  async function unshift (id) {
    if (!id) return;
    const subject = await StepUpSubject.findById(id).lean();
    subjects.unshift(subject);
    await unshift(subject.parent);
  }
};

const createSubject = async (req, res) => {
  const { name, level, parent = null } = req.body;
  const condition = { level, parent: parent ?? { $eq: null } };
  const last = (await StepUpSubject.find(condition).sort({ order: -1 }))[0];
  const order = (last?.order || 0) + 1;
  
  const subject = await StepUpSubject.create({ name, order, parent, level });
  res.json(createResponse(res, subject));
};

const updateSubjectName = async (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  await StepUpSubject.updateOne({ _id: id }, { $set: { name } });
  res.json(createResponse(res));
};

const removeSubject = async (req, res) => {
  const { id } = req.params;
  
  const subject = await StepUpSubject.findById(id);
  
  await remove(id);
  await subject?.deleteOne();
  
  res.json(createResponse(res));
  
  async function remove (parent) {
    const subjects = await StepUpSubject.find({ parent });
    await Promise.all(subjects.map(({ _id }) => remove(_id)));
    await Promise.all(subjects.map(({ _id }) => StepUpSubject.deleteOne({ _id })));
  }
};

const getContents = async (req, res) => {
  const { query: { subject } } = req;
  const condition = subject ? { subject } : {};
  const contents = await StepUpContent.find(condition)
    .populate({ path: 'writer', model: UserInfo });
  
  res.json(createResponse(res, contents));
};

const getContent = async (req, res, next) => {
  const { params: { id }, user } = req;
  const content = await StepUpContent.findById(id)
    .populate({ path: 'writer', model: UserInfo });
  
  if (!content) return next(STEP_UP_CONTENT_NOT_FOUND);
  if (!user || !hasRoles(user)) {
    content.hits++;
    content.save();
  }
  
  res.json(createResponse(res, content));
};

const createContent = async (req, res) => {
  const { user } = req;
  const body = cloneDeep(req.body);
  
  console.log(body);
  
  body.writer = user.info;
  
  const document = await StepUpContent.create(body);
  const urls = findImageUrlsFromHtml(req.body.content || '');
  
  await updateFiles(req, document._id, 'StepUpContent', urls);
  res.json(createResponse(res, document));
};

const updateContent = async (req, res, next) => {
  const { params: { id }, body } = req;
  const $set = cloneDeep(body);
  const document = await StepUpContent.findById(id);
  
  if (!document) return next(STEP_UP_CONTENT_NOT_FOUND);
  
  const urls = findImageUrlsFromHtml(body.content || '');
  
  await Promise.all([
    document.updateOne({ $set }),
    updateFiles(req, document._id, 'StepUpContent', urls)
  ]);
  
  res.json(createResponse(res));
};

const removeContent = async (req, res, next) => {
  const { params: { id } } = req;
  const document = await StepUpContent.findById(id);
  
  if(!document) return next(STEP_UP_CONTENT_NOT_FOUND);
  
  const urls = findImageUrlsFromHtml(document.content || '');
  
  await Promise.all([
    document.deleteOne(),
    removeFilesByUrls(req, urls)
  ]);
  
  res.json(createResponse(res));
};

exports.getLevels = asyncHandler(getLevels);
exports.createLevel = asyncHandler(createLevel);
exports.reorderLevels = asyncHandler(reorderLevels);
exports.updateLevelName = asyncHandler(updateLevelName);
exports.removeLevel = asyncHandler(removeLevel);
exports.getSubjects = asyncHandler(getSubjects);
exports.getSubjectSequence = asyncHandler(getSubjectSequence);
exports.createSubject = asyncHandler(createSubject);
exports.updateSubjectName = asyncHandler(updateSubjectName);
exports.removeSubject = asyncHandler(removeSubject);
exports.getContents = asyncHandler(getContents);
exports.getContent = asyncHandler(getContent);
exports.createContent = asyncHandler(createContent);
exports.updateContent = asyncHandler(updateContent);
exports.removeContent = asyncHandler(removeContent);
