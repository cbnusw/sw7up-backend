const asyncHandler = require('express-async-handler');
const { LanguageFilter, Professor, Project, Student, Topcit, UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { FORBIDDEN } = require('../../../shared/errors');

const getStudents = async (req, res) => {
  const { user } = req;
  const { no } = await UserInfo.findById(user.info).lean();
  const professor = await Professor.findOne({ no }).lean();
  
  const students = await Student.find({ professor: professor._id }).lean();
  
  res.json(createResponse(res, students));
};

const getTopcitsOfStudent = async (req, res, next) => {
  const { user, params: { no: studentNo } } = req;
  const { no: professorNo } = await UserInfo.findById(user.info);
  if (!await (_validateStudent(professorNo, studentNo))) next(FORBIDDEN);
  const topcits = await Topcit.find({ 'student.no': studentNo }).sort({ no: -1 }).lean();
  res.json(createResponse(res, topcits));
};

const getLanguagesOfStudent = async (req, res, next) => {
  const { user, params: { no: studentNo } } = req;
  const { no: professorNo } = await UserInfo.findById(user.info);
  if (!await (_validateStudent(professorNo, studentNo))) next(FORBIDDEN);
  const student = await UserInfo.findOne({ no: studentNo });
  if (!student) {
    res.json(createResponse(res));
  } else {
    const $in = (await LanguageFilter.find().select('name').lean()).map(({ name }) => name);
    const result = await Project.aggregate([
      { $match: { creator: student._id } },
      { $project: { meta: 1 } },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } }
    ]);
    console.log(JSON.stringify(result, null, 2));
    res.json(createResponse(res));
  }
  
};

async function _validateStudent (professorNo, studentNo) {
  const [professor, student] = await Promise.all([Professor.findOne({ no: professorNo }), Student.findOne({ no: studentNo })]);
  return String(student.professor) === String(professor._id);
}

exports.getStudents = asyncHandler(getStudents);
exports.getTopcitsOfStudent = asyncHandler(getTopcitsOfStudent);
exports.getLanguagesOfStudent = asyncHandler(getLanguagesOfStudent);
