const asyncHandler = require('express-async-handler');
const { OVERSEAS_EDUCATION_NOT_FOUND } = require('../../../../shared/errors');
const { OverseasEducation, UserInfo } = require('../../../../shared/models');
const { createResponse } = require('../../../../shared/utils/response');
const { findImageUrlsFromHtml, updateFiles, removeFilesByUrls } = require('../../../../shared/utils/file');
const { hasRoles } = require('../../../../shared/utils/permission');

const getOverseasEducations = asyncHandler(async (req, res) => {
  const data = await OverseasEducation.search(req.query, null, [{ path: 'writer', model: UserInfo }]);
  res.json(createResponse(res, data));
});

const getOverseasEducation = asyncHandler(async (req, res) => {
  const { params: { id }, user } = req;
  const document = await OverseasEducation.findById(id)
    .populate({ path: 'writer', model: UserInfo })
    .populate({ path: 'attachments' });
  
  if (!document) throw OVERSEAS_EDUCATION_NOT_FOUND;
  if (!user || !hasRoles(user)) {
    document.hits++;
    document.save();
  }
  
  res.json(createResponse(res, document));
});

const createOverseasEducation = asyncHandler(async (req, res) => {
  const { body, user } = req;
  const urls = [
    ...body.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(body.content)
  ];
  
  body.writer = user.info;
  body.attachments = (body.attachments || []).map(attachment => attachment._id);
  
  const document = await OverseasEducation.create(body);
  await updateFiles(req, document._id, 'OverseasEducation', urls);
  
  res.json(createResponse(res, document));
});

const updateOverseasEducation = asyncHandler(async (req, res) => {
  const { params: { id }, body: $set } = req;
  const document = await OverseasEducation.findById(id);
  
  if (!document) throw OVERSEAS_EDUCATION_NOT_FOUND;
  
  const urls = [
    ...$set.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml($set.content)
  ];
  
  await Promise.all([
    document.updateOne({ $set }),
    updateFiles(req, document._id, 'OverseasEducation', urls)
  ]);
  
  res.json(createResponse(res));
});

const removeOverseasEducation = asyncHandler(async (req, res) => {
  const { params: { id } } = req;
  const document = await OverseasEducation.findById(id)
    .populate({ path: 'attachments', select: 'url' });
  
  if (!document) throw OVERSEAS_EDUCATION_NOT_FOUND;
  
  const urls = [
    ...document.attachments.map(attachment => attachment.url),
    ...findImageUrlsFromHtml(document.content)
  ];
  
  await Promise.all([
    document.deleteOne(),
    removeFilesByUrls(req, urls)
  ]);
  
  res.json(createResponse(res));
});

exports.getOverseasEducations = getOverseasEducations;
exports.getOverseasEducation = getOverseasEducation;
exports.createOverseasEducation = createOverseasEducation;
exports.updateOverseasEducation = updateOverseasEducation;
exports.removeOverseasEducation = removeOverseasEducation;
