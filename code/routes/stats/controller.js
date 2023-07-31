const service = require('./service');

const asyncHandler = require('express-async-handler');
const { createResponse } = require('../../../shared/utils/response');
const { Types } = require('mongoose');

const getProjects = async (req, res) => {
  const { query } = req;
  const filter = _convertProjectQuery(query);
  const [total, years, grades, departments] = await Promise.all([
    service.getStats(filter),
    service.getStatsByYears(filter),
    service.getStatsByGrades(filter),
    service.getStatsByDepartments(filter),
  ]);
  
  res.json(createResponse(res, {
    total,
    years,
    grades,
    departments,
  }));
};

const getLanguages = async (req, res) => {
  const { query } = req;
  const filter = _convertProjectQuery(query);
  const result = await service.getLanguages(filter);
  res.json(createResponse(res, result));
};

const getRankings = async (req, res) => {
  const { query } = req;
  const { type, limit, ...q } = query;
  const filter = _convertProjectQuery(q);
  const result = await service.getRankings(filter, type, limit);
  res.json(createResponse(res, result));
};

const getTopcitStats = async (req, res) => {
  const { params: { no } } = req;
  const filter = { no: +no };
  const documents = await service.getTopcitStats(filter);
  res.json(createResponse(res, documents));
};

const getStudentProjects = async (req, res) => {
  const { query } = req;
  const filter = _convertProjectQuery(query, req.studentId);
  const [total, years, grades] = await Promise.all([
    service.getStats(filter),
    service.getStatsByYears(filter),
    service.getStatsByGrades(filter),
  ]);
  
  res.json(createResponse(res, {
    total,
    years,
    grades,
  }));
};

const getStudentProjectYears = async (req, res) => {
  const { studentId } = req;
  const filter = {
    creator: typeof studentId === 'string' ? new Types.ObjectId(studentId) : studentId,
    source: { $ne: null }
  };
  const years = await service.getStudentProjectYears(filter);
  res.json(createResponse(res, years));
};

const getStudentLanguages = async (req, res) => {
  const { query } = req;
  const filter = _convertProjectQuery(query, req.studentId);
  const result = await service.getLanguages(filter);
  res.json(createResponse(res, result));
};

const getStudentTopcits = async (req, res) => {
  const { params: { no } } = req;
  const documents = await service.getTopcits(no);
  res.json(createResponse(res, documents));
};

const getStudentStepUps = async (req, res) => {
  const { params: { no } } = req;
  const documents = await service.getStepUps(no);
  res.json(createResponse(res, documents));
};

function _convertProjectQuery (query, creator = null) {
  const filter = { source: { $ne: null } };
  const { startYear, endYear, startCreatedAt, endCreatedAt, startPerformedAt, endPerformedAt, department } = query;
  
  if (startYear && endYear)filter.year = { $gte: +startYear, $lte: +endYear };
  else if (startYear) filter.year = { $gte: +startYear };
  else if (endYear) filter.year = { $lte: +endYear };
  
  if (startCreatedAt && endCreatedAt) filter.createdAt = { $gte: new Date(startCreatedAt), $lte: new Date(endCreatedAt) };
  else if (startCreatedAt) filter.createdAt = { $gte: new Date(startCreatedAt) };
  else if (endCreatedAt) filter.createdAt = { $lte: new Date(endCreatedAt) };
  
  if (startPerformedAt && endPerformedAt) filter.performedAt = { $gte: startPerformedAt, $lte: endPerformedAt };
  else if (startPerformedAt) filter.performedAt = { $gte: startPerformedAt };
  else if (endPerformedAt) filter.performedAt = { $lte: endPerformedAt };
  
  if (department && department !== '기타') {
    const $in = department.split(',');
    filter.department = { $in };
  } else if (department === '기타') {
    const $nin = ['소프트웨어학과', '소프트웨어학부', '정보통신공학부', '컴퓨터공학과', '지능로봇공학과'];
    filter.department = { $nin };
  }
  
  if (creator) {
    creator = typeof creator === 'string' ? new Types.ObjectId(creator) : creator;
    filter.creator = creator;
  }
  return filter;
}

exports.getProjects = asyncHandler(getProjects);
exports.getLanguages = asyncHandler(getLanguages);
exports.getRankings = asyncHandler(getRankings);
exports.getTopcitStats = asyncHandler(getTopcitStats);
exports.getStudentProjects = asyncHandler(getStudentProjects);
exports.getStudentProjectYears = asyncHandler(getStudentProjectYears);
exports.getStudentLanguages = asyncHandler(getStudentLanguages);
exports.getStudentTopcits = asyncHandler(getStudentTopcits);
exports.getStudentStepUps = asyncHandler(getStudentStepUps);
