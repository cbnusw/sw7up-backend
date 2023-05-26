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
  const filter = { creator: typeof studentId === 'string' ? new Types.ObjectId(studentId) : studentId };
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
  const { startYear, endYear } = query;
  if (startYear && endYear) {
    filter.year = {
      $gte: +startYear, $lte: +endYear
    };
  } else if (startYear) {
    filter.year = { $gte: +startYear };
  } else if (endYear) {
    filter.year = { $lte: +endYear };
  }
  
  if (creator) {
    creator = typeof creator === 'string' ? new Types.ObjectId(creator) : creator;
    filter.creator = creator;
  }
  return filter;
}

exports.getProjects = asyncHandler(getProjects);
exports.getLanguages = asyncHandler(getLanguages);
exports.getTopcitStats = asyncHandler(getTopcitStats);
exports.getStudentProjects = asyncHandler(getStudentProjects);
exports.getStudentProjectYears = asyncHandler(getStudentProjectYears);
exports.getStudentLanguages = asyncHandler(getStudentLanguages);
exports.getStudentTopcits = asyncHandler(getStudentTopcits);
exports.getStudentStepUps = asyncHandler(getStudentStepUps);
