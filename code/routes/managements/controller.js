const asyncHandler = require('express-async-handler');
const { existsSync, mkdirSync } = require('fs');
const { join } = require('path');
const xlsx = require('xlsx');
const { UserInfo, Project, LanguageFilter } = require('../../../shared/models');
const { toRegEx } = require('../../../shared/models/mappers');
const { createResponse } = require('../../../shared/utils/response');
const { ROOT_DIR } = require('../../../shared/env');

const _createMatchPipeline = async query => {
  const MAJORS = [
    '소프트웨어학과',
    '소프트웨어학부',
    '컴퓨터공학과',
    '정보통신공학부',
    '지능로봇공학과'
  ];
  
  const {
    createdStart,
    createdEnd,
    grade,
    performedStart,
    performedEnd,
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
  
  if (createdStart) $match.createdAt = { $gte: new Date(createdStart) };
  if (createdEnd) $match.createdAt ? $match.createdAt.$lte = new Date(createdEnd) : $match.createdAt = { $lte: new Date(createdEnd) };
  if (grade) $match.grade = +grade;
  if (performedStart) $match.performedAt = { $gte: performedStart };
  if (performedEnd) $match.performedAt ? $match.performedAt.$lte = performedEnd : $match.performedAt = { $lte: performedEnd };
  if (!creatorNo && creatorName) {
    const $in = (await UserInfo.find({ name: creatorName }).select('_id').lean()).map(user => user._id);
    $match.creator = { $in };
  }
  if (creatorNo) $match.creator = (await UserInfo.findOne({ no: creatorNo }).select('_id').lean())._id;
  if (school) school === '충북대학교' ? $match.school = school : $match.school = { $ne: '충북대학교' };
  if (departments) {
    const departmentList = departments.split(',');
    if (departmentList.includes('기타')) {
      const $nin = MAJORS.filter(major => !departmentList.includes(major));
      if ($nin.length > 0) $match.department = { $nin };
    } else {
      const $in = departmentList;
      $match.department = { $in };
    }
  }
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
  return [];
};

const _createPagePipeline = query => {
  const { limit, skip = 0 } = query;
  if (limit) return [{ $skip: +skip }, { $limit: +limit }];
  else return [];
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
  
    result.push([
      _id,
      name || '-',          // 프로젝트 이름
      school || '-',        // 소속 학교
      department || '-',    // 소속 학과
      creator.no || '-',    // 학번
      creator.name || '-',  // 학생 이름
      year || '-',          // 수행 년도
      grade || '-',         // 수행 학년
      semester || '-',      // 수행 학기
      projectType || '-',   // 프로젝트 유형
      subjectName || '-',   // 교과목명/자체프로젝트 유형
      createdAt || '-',     // 등록일
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
    ['프로젝트명', '소속학교', '소속학과(부)', '학번', '이름', '수행연도', '수행학년', '수행학기', '프로젝트유형', '교과목명/자체프로젝트', '등록일', '파일수(등록언어)', '코드라인수(등록언어)', '주석수(등록언어)', '사용언어(등록언어)', '파일수(전체)', '코드수(전체)', '주석수(전체)', '사용언어(전체)', '요약'],
    ...data.documents.map(document => document.slice(1))
  ];
  
  const { filepath, filename } = _createExcel([{ sheetData, sheetName: '등록된 프로젝트' }]);
  
  res.download(filepath, filename);
};

exports.getProjects = asyncHandler(getProjects);
exports.downloadProjects = asyncHandler(downloadProjects);
