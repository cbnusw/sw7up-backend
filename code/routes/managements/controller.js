const asyncHandler = require('express-async-handler');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const xlsx = require('xlsx');
const { LanguageFilter, Professor, Project, StepUp, Student, Topcit, TopcitStat, UserInfo } = require('../../../shared/models');
const { toRegEx } = require('../../../shared/models/mappers');
const { createResponse } = require('../../../shared/utils/response');
const { ROOT_DIR } = require('../../../shared/env');
const { convertDepartmentFilter } = require('../../utils/departments-filter');

const _createMatchPipeline = async query => {
  const {
    startCreatedAt,
    endCreatedAt,
    grade,
    startPerformedAt,
    endPerformedAt,
    creatorName,
    creatorNo,
    school,
    departments,
    projectType,
    subjectName,
    ownProjectType,
    professor,
  } = query;
  const $match = {};
  
  if (startCreatedAt) $match.createdAt = { $gte: new Date(startCreatedAt) };
  if (endCreatedAt) $match.createdAt ? $match.createdAt.$lte = new Date(endCreatedAt) : $match.createdAt = { $lte: new Date(endCreatedAt) };
  if (grade) $match.grade = +grade;
  if (startPerformedAt) $match.performedAt = { $gte: startPerformedAt };
  if (endPerformedAt) $match.performedAt ? $match.performedAt.$lte = endPerformedAt : $match.performedAt = { $lte: endPerformedAt };
  if (!creatorNo && creatorName) {
    const $in = (await UserInfo.find({ name: creatorName }).select('_id').lean()).map(user => user._id);
    $match.creator = { $in };
  }
  if (creatorNo) $match.creator = (await UserInfo.findOne({ no: creatorNo }).select('_id').lean())._id;
  if (school) school === '충북대학교' ? $match.school = school : $match.school = { $ne: '충북대학교' };
  if (departments) convertDepartmentFilter($match, departments);
  if (projectType) $match.projectType = projectType;
  if (subjectName) $match['subject.name'] = toRegEx(subjectName);
  if (ownProjectType) $match['ownProject.type'] = ownProjectType;
  if (professor) $match.$or = [
    { 'subject.professor': toRegEx(professor) }, { 'ownProject.professor': toRegEx(professor) }
  ];
  return [{ $match }];
};

const _createSortPipeline = query => {
  const { sort } = query;
  if (sort) {
    const chunks = sort.split(',');
    const $sort = {};
    chunks.forEach(chunk => {
      const [property, direction] = chunk.split('::');
      $sort[property] = +direction;
    });
    return [{ $sort }];
  }
  return [{ $sort: { createdAt: -1 } }];
};

const _createPagePipeline = query => {
  const { limit, skip = 0 } = query;
  if (limit) return [{ $skip: +skip }, { $limit: +limit }]; else return [];
};

const _searchProjectList = async query => {
  const match = await _createMatchPipeline(query);
  const sort = _createSortPipeline(query);
  const page = _createPagePipeline(query);
  const searchPipeline = [...match, ...sort, ...page];
  const countPipeline = [...match, { $count: 'total' }];
  const { total } = (await Project.aggregate(countPipeline).allowDiskUse(true))[0] || { total: 0 };
  let documents = await Project.aggregate(searchPipeline).allowDiskUse(true);
  documents = await Project.populate(documents, { path: 'creator', model: UserInfo });
  return { total, documents };
};

const _convertDocumentsToArray = async (documents) => {
  const filters = (await LanguageFilter.find().select('name').lean()).map(f => f.name);
  const result = [];
  const metaToStr = meta => meta.map(info => `${info.language}: ${info.files} / ${info.codes} / ${info.comments}`).join('\n');
  
  for (let project of documents) {
    const {
      _id, name, school, department, year, grade, semester, createdAt, projectType, subject, ownProject, meta, creator
    } = project;
    
    const filteredMeta = meta
      .filter(item => filters.includes(item.language))
      .map(item => [item.files, item.codes, item.comments, item.language])
      .reduce((acc, cur) => {
        acc[0] += cur[0];
        acc[1] += cur[1];
        acc[2] += cur[2];
        acc[3].push(cur[3]);
        return acc;
      }, [0, 0, 0, []]);
    const notFilteredMeta = meta
      .map(item => [item.files, item.codes, item.comments, item.language])
      .reduce((acc, cur) => {
        acc[0] += cur[0];
        acc[1] += cur[1];
        acc[2] += cur[2];
        acc[3].push(cur[3]);
        return acc;
      }, [0, 0, 0, []]);
    
    const subjectName = projectType ? (projectType === '교과목프로젝트' ? (subject ? subject.name : '-') : (ownProject ? ownProject.type : '-')) : '-';
    const professor = projectType ? (projectType === '교과목프로젝트' ? (subject ? subject.professor : '-') : (ownProject ? ownProject.professor : '-')) : '-';
    
    result.push([
      _id, name || '-',                // 프로젝트 이름
      school || '-',              // 소속 학교
      department || '-',          // 소속 학과
      creator.no || '-',          // 학번
      creator.name || '-',        // 학생 이름
      year ? `${year}년` : '-',    // 수행 년도
      grade ? `${grade}학년` : '-', // 수행 학년
      semester || '-',             // 수행 학기
      projectType || '-',          // 프로젝트 유형
      subjectName || '-',          // 교과목명/자체프로젝트 유형
      professor || '-',            // 담당 교수
      createdAt || '-',            // 등록일
      ...filteredMeta.slice(0, 3),    // 등록된 언어의 파일수, 코드라인수, 주석수
      filteredMeta[3].join('\n'),     // 등록된 언어 중 사용한 언어
      ...notFilteredMeta.slice(0, 3), // 전체 언어의 파일수, 코드라인수, 주석수
      notFilteredMeta[3].join('\n'),  // 전체 언어 중 사용한 언어
      metaToStr(meta),
    ]);
  }
  return result;
};

const _createExcel = (data, prefix = '코딩이력관리') => {
  const dir = join(ROOT_DIR, 'code-managements-files');
  if (!existsSync(dir)) mkdirSync(dir);
  const filename = `${prefix}_${new Date().getTime()}.xlsx`;
  const filepath = join(dir, filename);
  const book = xlsx.utils.book_new();
  data.forEach(sheet => {
    const { sheetData, sheetName } = sheet;
    const s = xlsx.utils.aoa_to_sheet(sheetData);
    xlsx.utils.book_append_sheet(book, s, sheetName);
  });
  
  xlsx.writeFile(book, filepath);
  return { filepath, filename };
};

const getProjects = async (req, res) => {
  const data = await _searchProjectList(req.query);
  data.documents = await _convertDocumentsToArray(data.documents);
  res.json(createResponse(res, data));
};

const downloadProjects = async (req, res) => {
  const data = await _searchProjectList(req.query);
  data.documents = await _convertDocumentsToArray(data.documents);
  const sheetData = [
    [
      '프로젝트명', '소속학교', '소속학과(부)', '학번', '이름', '수행연도', '수행학년', '수행학기', '프로젝트유형', '교과목명/자체프로젝트', '담당교수', '등록일', '파일수(등록언어)', '코드라인수(등록언어)', '주석수(등록언어)', '사용언어(등록언어)', '파일수(전체)', '코드수(전체)', '주석수(전체)', '사용언어(전체)', '요약'
    ], ...data.documents.map(document => document.slice(1))
  ];
  
  const { filepath, filename } = _createExcel([{ sheetData, sheetName: '등록된 프로젝트' }]);
  
  res.download(filepath, filename);
};

const getStudents = async (req, res) => {
  const defaultLimit = 30;
  const { query } = req;
  let { limit, skip } = query;
  limit = +(limit || defaultLimit);
  skip = +(skip || 0);
  if (isNaN(limit)) limit = defaultLimit;
  if (isNaN(skip)) skip = 0;
  
  const filter = await createFilter(query);
  const total = await Student.countDocuments(filter);
  const documents = await Student.find(filter).sort({
    department: 1, name: 1
  }).limit(limit).skip(skip).populate({ path: 'professor' });
  
  res.json(createResponse(res, { total, documents }));
  
  async function createFilter (query) {
    const { professorNo, professorName, studentNo, studentName, department } = query;
    const filter = {};
    
    let $in;
    if (department) filter.department = department;
    if (professorNo) $in = (await Professor.find({ no: professorNo }).lean()).map(({ _id }) => _id);
    else if (professorName) $in = (await Professor.find({ name: toRegEx(professorName) }).lean()).map(({ _id }) => _id);
    if ($in) filter.professor = { $in };
    if (studentNo) filter.no = studentNo; else if (studentName) filter.name = toRegEx(studentName);
    
    return filter;
  }
};

const getStudentDepartments = async (req, res) => {
  const departments = await Student.distinct('department');
  res.json(createResponse(res, departments));
};

const registerStudents = async (req, res) => {
  const { body } = req;
  for (let data of body) await upsert(data);
  res.json(createResponse(res));
  
  async function upsert (data) {
    const { professor, student } = data;
    
    let professorDocument = await Professor.findOne({ no: professor.no });
    let studentDocument = await Student.findOne({ no: student.no });
    
    if (!professorDocument) professorDocument = await Professor.create(professor);
    if (!studentDocument) await Student.create({
      ...student,
      professor: professorDocument._id
    }); else await studentDocument.updateOne({ $set: { ...student, professor: professorDocument._id } });
  }
};

const clearStudents = async (req, res) => {
  await Student.deleteMany({});
  res.json(createResponse(res));
};

const removeStudent = async (req, res) => {
  const { params: { id } } = req;
  await Student.deleteOne({ _id: id });
  res.json(createResponse(res));
};

const getTopcits = async (req, res) => {
  const defaultLimit = 30;
  const { query } = req;
  let { limit, skip } = query;
  limit = +(limit || defaultLimit);
  skip = +(skip || 0);
  if (isNaN(limit)) limit = defaultLimit;
  if (isNaN(skip)) skip = 0;
  
  const filter = await createFilter(query);
  const total = await Topcit.countDocuments(filter);
  const documents = await Topcit.find(filter).sort({
    no: -1, 'student.name': 1
  }).limit(limit).skip(skip);
  
  res.json(createResponse(res, { total, documents }));
  
  async function createFilter (query) {
    const { no, year, level, department, grade, studentNo, studentName } = query;
    const filter = {};
    
    if (no) filter.no = +no;
    if (year) filter.year = +year;
    if (level) filter.level = +level;
    if (department) filter['student.department'] = department;
    if (grade) filter['student.grade'] = grade;
    if (studentNo) filter['student.no'] = studentNo; else if (studentName) filter['student.name'] = toRegEx(studentName);
    
    return filter;
  }
};

const getTopcitYears = async (req, res) => {
  const list = await Topcit.distinct('year');
  list.sort((a, b) => b - a);
  res.json(createResponse(res, list));
};

const getTopcitsNoList = async (req, res) => {
  const list = await Topcit.distinct('no');
  list.sort((a, b) => b - a);
  res.json(createResponse(res, list));
};

const getTopcitLevels = async (req, res) => {
  let list = await Topcit.distinct('level');
  list = list.filter(item => item !== null).sort();
  res.json(createResponse(res, list));
};

const getTopcitDepartments = async (req, res) => {
  const list = await Topcit.distinct('student.department');
  list.sort();
  res.json(createResponse(res, list));
};

const getTopcitGrades = async (req, res) => {
  const list = await Topcit.distinct('student.grade');
  list.sort();
  res.json(createResponse(res, list));
};

const registerTopcits = async (req, res) => {
  const { body: { clear, no, data } } = req;
  
  if (clear) await Topcit.deleteMany(no ? { no } : {});
  await Promise.all(data.map(upsert));
  res.json(createResponse(res));
  
  async function upsert (item) {
    const { no, student } = item;
    const document = await Topcit.findOne({ no, 'student.no': student.no });
    if (!document) await Topcit.create(item);
    else await document.updateOne({ $set: item });
  }
};

const removeTopcit = async (req, res) => {
  const { params: { id } } = req;
  await Topcit.deleteOne({ _id: id });
  res.json(createResponse(res));
};

const getTopcitStats = async (req, res) => {
  const defaultLimit = 30;
  const { query } = req;
  let { limit, skip } = query;
  limit = +(limit || defaultLimit);
  skip = +(skip || 0);
  if (isNaN(limit)) limit = defaultLimit;
  if (isNaN(skip)) skip = 0;
  
  const filter = await createFilter(query);
  const total = await TopcitStat.countDocuments(filter);
  const documents = await TopcitStat.find(filter).sort({
    no: -1
  }).limit(limit).skip(skip).lean();
  
  res.json(createResponse(res, { total, documents }));
  
  async function createFilter (query) {
    const { no, year, category } = query;
    const filter = {};
    
    if (no) filter.no = +no;
    if (year) filter.year = +year;
    if (category) filter.category = category;
    
    return filter;
  }
};

const getTopcitStatCategories = async (req, res) => {
  const categories = await TopcitStat.distinct('category');
  categories.sort((a, b) => {
    if (a === '전국') return -1;
    if (b === '전국') return 1;
    if (a === '학교') return -1;
    if (b === '학교') return 1;
    return a <= b ? -1 : 1;
  });
  res.json(createResponse(res, categories));
};

const getTopcitStatYears = async (req, res) => {
  const years = await TopcitStat.distinct('year');
  years.sort((a, b) => b - a);
  res.json(createResponse(res, years));
};

const getTopcitStatNoList = async (req, res) => {
  const noList = await TopcitStat.distinct('no');
  noList.sort((a, b) => b - a);
  res.json(createResponse(res, noList));
};

const registerTopcitStats = async (req, res) => {
  const { body: { clear, no, data } } = req;
  
  if (clear) await TopcitStat.deleteMany(no ? { no } : {});
  await Promise.all(data.map(upsert));
  res.json(createResponse(res));
  
  async function upsert (item) {
    const { category, no } = item;
    const document = await TopcitStat.findOne({ no, category });
    if (!document) await TopcitStat.create(item);
    else await document.updateOne({ $set: item });
  }
};

const removeTopcitStat = async (req, res) => {
  const { params: { id } } = req;
  await TopcitStat.deleteOne({ _id: id });
  res.json(createResponse(res));
};

const getStepUpData = async (req, res) => {
  const defaultLimit = 30;
  const { query } = req;
  let { limit, skip } = query;
  limit = +(limit || defaultLimit);
  skip = +(skip || 0);
  if (isNaN(limit)) limit = defaultLimit;
  if (isNaN(skip)) skip = 0;
  
  const filter = await createFilter(query);
  const total = await StepUp.countDocuments(filter);
  const documents = await StepUp.find(filter).sort({
    performedAt: -1,
    level: -1,
    department: 1,
    name: 1,
  }).limit(limit).skip(skip);
  
  res.json(createResponse(res, { total, documents }));
  
  async function createFilter (query) {
    const { startPerformedAt, endPerformedAt, level, pass, departments, no, name } = query;
    const filter = {};
    
    if (startPerformedAt && endPerformedAt) filter.performedAt = { $gte: startPerformedAt, $lte: endPerformedAt };
    else if (startPerformedAt) filter.performedAt = { $gte: startPerformedAt };
    else if (endPerformedAt) filter.performedAt = { $lte: endPerformedAt };
    
    if (level) filter.level = +level;
    if (pass) filter.pass = pass === 'true';
    if (departments) convertDepartmentFilter(filter, departments);
    if (no) filter.no = no;
    else if (name) filter.name = toRegEx(name);
    
    return filter;
  }
};

const getStepUpLevels = async (req, res) => {
  const levels = await StepUp.distinct('level');
  levels.sort();
  res.json(createResponse(res, levels));
};

const registerStepUpData = async (req, res) => {
  const { body: { clear, data } } = req;
  
  if (clear) await StepUp.deleteMany({});
  await Promise.all(data.map(upsert));
  res.json(createResponse(res));
  
  async function upsert (item) {
    const { no, level } = item;
    const document = await StepUp.findOne({ no, level });
    if (!document) await StepUp.create(item);
    else await document.updateOne({ $set: item });
  }
};

const removeStepUp = async (req, res) => {
  const { params: { id } } = req;
  await StepUp.deleteOne({ _id: id });
  res.json(createResponse(res));
};


exports.getProjects = asyncHandler(getProjects);
exports.downloadProjects = asyncHandler(downloadProjects);

exports.getStudents = asyncHandler(getStudents);
exports.getStudentDepartments = asyncHandler(getStudentDepartments);
exports.registerStudents = asyncHandler(registerStudents);
exports.clearStudents = asyncHandler(clearStudents);
exports.removeStudent = asyncHandler(removeStudent);

exports.getTopcits = asyncHandler(getTopcits);
exports.getTopcitYears = asyncHandler(getTopcitYears);
exports.getTopcitsNoList = asyncHandler(getTopcitsNoList)
exports.getTopcitLevels = asyncHandler(getTopcitLevels);
exports.getTopcitDepartments = asyncHandler(getTopcitDepartments);
exports.getTopcitGrades = asyncHandler(getTopcitGrades);
exports.registerTopcits = asyncHandler(registerTopcits);
exports.removeTopcit = asyncHandler(removeTopcit);

exports.getTopcitStats = asyncHandler(getTopcitStats);
exports.getTopcitStatCategories = asyncHandler(getTopcitStatCategories);
exports.getTopcitStatYears = asyncHandler(getTopcitStatYears);
exports.getTopcitStatNoList = asyncHandler(getTopcitStatNoList);
exports.registerTopcitStats = asyncHandler(registerTopcitStats);
exports.removeTopcitStat = asyncHandler(removeTopcitStat);

exports.getStepUpData = asyncHandler(getStepUpData);
exports.getStepUpLevels = asyncHandler(getStepUpLevels);
exports.registerStepUpData = asyncHandler(registerStepUpData);
exports.removeStepUp = asyncHandler(removeStepUp);
