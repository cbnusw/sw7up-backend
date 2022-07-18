const asyncHandler = require('express-async-handler');
const { STUDENT_ACTIVITY_NOT_FOUND } = require('../../../../shared/errors');
const { StudentActivity, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { hasRoles } = require('../../../../shared/utils/permission');
const { findImageUrlsFromHtml, updateFiles, removeFilesByUrls } = require('../../../../shared/utils/file');

const getStudentActivities = async (req, res) => {
  const data = await StudentActivity.search(req.query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, data));
};

const getStudentActivity = async (req, res) => {
  const { params: { id }, user } = req;
  const document = await StudentActivity.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate({ path: 'attachments' });
  
  if (!document) throw STUDENT_ACTIVITY_NOT_FOUND;
  if (!user || !hasRoles(user)) {
    document.hits++;
    document.save();
  }
  
  res.json(createResponse(res, document));
};

const createStudentActivity = async (req, res) => {
  const { body, user } = req;
  const urls = [
    ...body.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(body.content)
  ];
  
  body.writer = user.info;
  body.attachments = (body.attachments || []).map(attachment => attachment._id);
  
  const document = await StudentActivity.create(body);
  await updateFiles(req, document._id, 'StudentActivity', urls);
  
  res.json(createResponse(res, document));
};

const updateStudentActivity = async (req, res) => {
  const { params: { id }, body: $set } = req;
  const document = await StudentActivity.findById(id);
  
  if (!document) throw STUDENT_ACTIVITY_NOT_FOUND;
  
  const urls = [
    ...$set.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml($set.content)
  ];
  
  await Promise.all([
    document.updateOne({ $set }),
    updateFiles(req, document._id, 'StudentActivity', urls)
  ]);
  
  res.json(createResponse(res));
};

const removeStudentActivity = async (req, res) => {
  const { params: { id } } = req;
  const document = await StudentActivity.findById(id)
    .populate({ path: 'attachments', select: 'url' });
  
  if (!document) throw STUDENT_ACTIVITY_NOT_FOUND;
  
  const urls = [
    ...document.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(document.content)
  ];
  
  await Promise.all([
    document.deleteOne(),
    removeFilesByUrls(req, urls)
  ]);
  
  res.json(createResponse(res));
};

exports.getStudentActivities = asyncHandler(getStudentActivities);
exports.getStudentActivity = asyncHandler(getStudentActivity);
exports.createStudentActivity = asyncHandler(createStudentActivity);
exports.updateStudentActivity = asyncHandler(updateStudentActivity);
exports.removeStudentActivity = asyncHandler(removeStudentActivity);
