const asyncHandler = require('express-async-handler');
const { Types } = require('mongoose');
const { LanguageFilter, Project } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { SEMESTERS } = require('../../../shared/constants');

const count = async (req, res) => {
  const $in = (await LanguageFilter.find()).map(filter => filter.name);
  const pipeline = [
    { $match: { source: { $ne: null } } }, { $unwind: '$meta' }, { $match: { 'meta.language': { $in } } },
  ];
  
  const results = await Promise.all([
    Project.countDocuments({ source: { $ne: null } }),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.files' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.comments' } } }]),
  ]);
  
  res.json(createResponse(res, {
    projects: results[0],
    files: results[1][0]?.count || 0,
    codes: results[2][0]?.count || 0,
    comments: results[3][0]?.count || 0
  }));
};

const countMe = async (req, res) => {
  const { user } = req;
  const $in = (await LanguageFilter.find()).map(filter => filter.name);
  const pipeline = [
    { $match: { source: { $ne: null }, creator: new Types.ObjectId(user.info) } },
    { $unwind: '$meta' },
    { $match: { 'meta.language': { $in } } },
  ];
  
  const results = await Promise.all([
    Project.countDocuments({ source: { $ne: null }, creator: new Types.ObjectId(user.info) }),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.files' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: null, 'count': { $sum: '$meta.comments' } } }]),
  ]);
  
  res.json(createResponse(res, {
    projects: results[0],
    files: results[1][0]?.count || 0,
    codes: results[2][0]?.count || 0,
    comments: results[3][0]?.count || 0,
  }));
};

const getDepartments = async (req, res) => {
  const DEP_SOFT = ['소프트웨어학과', '소프트웨어학부'];
  const DEP_COM = '컴퓨터공학과';
  const DEP_IC = '정보통신공학부';
  const DEP_IR = '지능로봇공학과';
  const DEP_ALL = [...DEP_SOFT, DEP_COM, DEP_IC, DEP_IR];
  const $in = (await LanguageFilter.find()).map(filter => filter.name);
  const pipeline = [
    { $unwind: '$meta' }, { $match: { 'meta.language': { $in } } },
  ];
  
  const results = await Promise.all([
    Project.countDocuments({
      source: { $ne: null },
      school: '충북대학교',
      department: { $in: DEP_SOFT }
    }),
    Project.countDocuments({
      source: { $ne: null },
      school: '충북대학교',
      department: DEP_COM
    }),
    Project.countDocuments({
      source: { $ne: null },
      school: '충북대학교',
      department: DEP_IC
    }),
    Project.countDocuments({
      source: { $ne: null },
      school: '충북대학교',
      department: DEP_IR
    }),
    Project.countDocuments({
      source: { $ne: null },
      $or: [{ school: { $ne: '충북대학교' } }, { $and: [{ school: '충북대학교' }, { department: { $nin: DEP_ALL } }] }]
    }),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: { $in: DEP_SOFT } } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_COM } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_IC } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_IR } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      {
        $match: {
          source: { $ne: null },
          $or: [{ school: { $ne: '충북대학교' } }, { $and: [{ school: '충북대학교' }, { department: { $nin: DEP_ALL } }] }]
        }
      },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: { $in: DEP_SOFT } } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_COM } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_IC } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }
    ]),
    Project.aggregate([
      { $match: { source: { $ne: null }, school: '충북대학교', department: DEP_IR } },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }
    ]),
    Project.aggregate([
      {
        $match: {
          source: { $ne: null },
          $or: [{ school: { $ne: '충북대학교' } }, { $and: [{ school: '충북대학교' }, { department: { $nin: DEP_ALL } }] }]
        }
      },
      ...pipeline,
      { $group: { _id: null, 'count': { $sum: '$meta.codes' } } }
    ]),
  ]);
  
  res.json(createResponse(res, {
    projects: [
      { name: '소프트웨어', value: results[0] },
      { name: '컴퓨터공학', value: results[1] },
      { name: '정보통신', value: results[2] },
      { name: '지능로봇', value: results[3] },
      { name: '기타', value: results[4] },
    ], files: [
      { name: '소프트웨어', value: results[5][0]?.count || 0 },
      { name: '컴퓨터공학', value: results[6][0]?.count || 0 },
      { name: '정보통신', value: results[7][0]?.count || 0 },
      { name: '지능로봇', value: results[8][0]?.count || 0 },
      { name: '기타', value: results[9][0]?.count || 0 },
    ], codes: [
      { name: '소프트웨어', value: results[10][0]?.count || 0 },
      { name: '컴퓨터공학', value: results[11][0]?.count || 0 },
      { name: '정보통신', value: results[12][0]?.count || 0 },
      { name: '지능로봇', value: results[13][0]?.count || 0 },
      { name: '기타', value: results[14][0]?.count || 0 },
    ]
  }));
};

const getMyLanguages = async (req, res) => {
  const { user } = req;
  const $in = (await LanguageFilter.find()).map(filter => filter.name);
  const pipeline = [
    { $match: { source: { $ne: null }, creator: new Types.ObjectId(user.info) } },
    { $unwind: '$meta' },
    { $match: { 'meta.language': { $in } } }
  ];
  const results = await Promise.all([
    Project.aggregate([...pipeline, { $group: { _id: '$meta.language', count: { $sum: '$meta.files' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: '$meta.language', count: { $sum: '$meta.codes' } } }]),
    Project.aggregate([...pipeline, { $group: { _id: '$meta.language', count: { $sum: '$meta.comments' } } }])
  ]);
  
  res.json(createResponse(res, {
    files: results[0].map(item => ({
      name: item._id, value: item.count
    })).sort((item1, item2) => item2.value - item1.value), codes: results[1].map(item => ({
      name: item._id, value: item.count
    })).sort((item1, item2) => item2.value - item1.value), comments: results[2].map(item => ({
      name: item._id, value: item.count
    })).sort((item1, item2) => item2.value - item1.value),
  }));
};

const getMySemesters = async (req, res) => {
  const { user } = req;
  const $in = (await LanguageFilter.find()).map(filter => filter.name);
  const pipeline = [
    {
      $match: {
        source: { $ne: null },
        creator: new Types.ObjectId(user.info),
        $and: [{ grade: { $ne: null } }, { semester: { $ne: null } }]
      }
    },
    { $unwind: '$meta' },
    { $match: { 'meta.language': { $in } } },
  ];
  
  const results = await Promise.all([
    Project.aggregate([
      { $match: { source: { $ne: null }, creator: new Types.ObjectId(user.info) } },
      { $group: { _id: { grade: '$grade', semester: '$semester' }, count: { $sum: 1 } } }
    ]),
    Project.aggregate([
      ...pipeline,
      { $group: { _id: { grade: '$grade', semester: '$semester' }, count: { $sum: '$meta.files' } } }
    ]),
    Project.aggregate([
      ...pipeline,
      { $group: { _id: { grade: '$grade', semester: '$semester' }, count: { $sum: '$meta.codes' } } }
    ]),
    Project.aggregate([
      ...pipeline,
      { $group: { _id: { grade: '$grade', semester: '$semester' }, count: { $sum: '$meta.comments' } } }
    ]),
  ]);
  
  const compare = (i1, i2) => i1._id.grade === i2._id.grade
    ? SEMESTERS.indexOf(i1._id.semester) - SEMESTERS.indexOf(i2._id.semester)
    : i1._id.grade - i2._id.grade;
  
  res.json(createResponse(res, {
    projects: results[0].sort(compare).map(item => ({
      name: `${item._id.grade}학년 ${item._id.semester}`,
      value: item.count
    })),
    files: results[1].sort(compare).map(item => ({
      name: `${item._id.grade}학년 ${item._id.semester}`,
      value: item.count
    })),
    codes: results[2].sort(compare).map(item => ({
      name: `${item._id.grade}학년 ${item._id.semester}`,
      value: item.count
    })),
    comments: results[3].sort(compare).map(item => ({
      name: `${item._id.grade}학년 ${item._id.semester}`,
      value: item.count
    })),
  }));
};

const getMyProjectsByGrade = async (req, res) => {
  const { user } = req;
  const grades = [1, 2, 3, 4, 5, 6];
  const results = await Promise.all(grades.map(grade => Project.find({
    source: { $ne: null },
    grade,
    creator: user.info
  }).select('-source').sort('_id').lean()));
  
  res.json(createResponse(res, results));
};

exports.count = asyncHandler(count);
exports.countMe = asyncHandler(countMe);
exports.getDepartments = asyncHandler(getDepartments);
exports.getMyLanguages = asyncHandler(getMyLanguages);
exports.getMySemesters = asyncHandler(getMySemesters);
exports.getMyProjectsByGrade = asyncHandler(getMyProjectsByGrade);
