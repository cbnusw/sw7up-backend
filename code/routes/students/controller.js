const asyncHandler = require('express-async-handler');
const { Types } = require('mongoose');
const service = require('./service');
const { createResponse } = require('../../../shared/utils/response');
const dayjs = require('dayjs');

const getMyReport = async (req, res) => {
  const { query, user } = req;
  const filter = _convertReportQuery(query, user.info);
  const [total, languages, projects] = await Promise.all([
    service.getTotalStat(filter),
    service.getLanguages(filter),
    service.getProjects(filter),
  ]);
  
  res.json(createResponse(res, {
    total,
    languages: Object.keys(languages).reduce((acc, key) => {
      Object.keys(languages[key]).forEach(langKey => {
        acc[langKey] = acc[langKey] || {};
        acc[langKey][key] = (acc[langKey][key] || 0) + languages[key][langKey];
      });
      return acc;
    }, {}),
    projects
  }));
};

function _convertReportQuery (query, creator) {
  creator = typeof creator === 'string' ? new Types.ObjectId(creator) : creator;
  const filter = { source: { $ne: null }, creator };
  const { startCreatedAt, endCreatedAt, startPerformedAt, endPerformedAt, startGrade, endGrade } = query;
  if (startCreatedAt && endCreatedAt) {
    filter.createdAt = { $gte: dayjs(startCreatedAt).toDate(), $lt: dayjs(endCreatedAt).toDate() };
  } else if (startCreatedAt) {
    filter.createdAt = { $gte: dayjs(startCreatedAt).toDate() };
  } else if (endCreatedAt) {
    filter.createdAt = { $lt: dayjs(endCreatedAt).toDate() };
  }
  
  if (startPerformedAt && endPerformedAt) {
    filter.performedAt = { $gte: startPerformedAt, $lte: endPerformedAt };
  } else if (startPerformedAt) {
    filter.performedAt = { $gte: startPerformedAt };
  } else if (endPerformedAt) {
    filter.performedAt = { $lte: endPerformedAt };
  }
  
  if (startGrade && endGrade) {
    filter.grade = { $gte: +startGrade, $lte: +endGrade };
  } else if (startGrade) {
    filter.grade = { $gte: +startGrade };
  } else if (endGrade) {
    filter.grade = { $lte: +endGrade };
  }
  
  return filter;
}

exports.getMyReport = asyncHandler(getMyReport);
