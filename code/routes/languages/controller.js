const asyncHandler = require('express-async-handler');
const { LANGUAGE_FILTER_NOT_FOUND } = require('../../../shared/errors');
const { LanguageFilter, Project } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');

const getProjectLanguages = async (req, res) => {
  const { query: { filter } } = req;
  const aggregate = [
    { $unwind: '$meta' },
  ];
  if (filter === 'true') {
    const $nin = (await LanguageFilter.find()).map(filter => filter.name);
    aggregate.push({ '$meta.language': { $nin } });
  }
  
  aggregate.push({ $group: { _id: { 'language': '$meta.language' }, 'count': { $sum: '$meta.files' } } });
  
  const data = await Project.aggregate(aggregate);
  
  const result = data.map(item => ({
    language: item._id.language,
    count: item.count
  })).sort((l1, l2) => l1.language < l2.language ? -1 : 1);
  
  res.json(createResponse(res, result));
};

const searchFilters = async (req, res) => {
  const { query } = req;
  const data = await LanguageFilter.search(query);
  
  res.json(createResponse(res, data));
};

const createFilter = async (req, res) => {
  const { body, user } = req;
  body.creator = user.info;
  
  const document = await LanguageFilter.create(body);
  
  res.json(createResponse(res, document, 201));
};

const removeFilter = async (req, res) => {
  const { params: { id } } = req;
  
  const document = await LanguageFilter.findById(id);
  
  if (!document) throw LANGUAGE_FILTER_NOT_FOUND;
  
  await document.deleteOne();
  
  res.json(createResponse(res));
};

exports.getProjectLanguages = asyncHandler(getProjectLanguages);
exports.searchFilters = asyncHandler(searchFilters);
exports.createFilter = asyncHandler(createFilter);
exports.removeFilter = asyncHandler(removeFilter);
