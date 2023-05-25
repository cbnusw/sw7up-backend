const asyncHandler = require('express-async-handler');
const { Professor, Student, UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');

const getStudents = async (req, res) => {
  const { user } = req;
  const { no } = await UserInfo.findById(user.info).lean();
  const professor = await Professor.findOne({ no }).lean();
  
  const students = await Student.find({ professor: professor._id }).lean();
  
  res.json(createResponse(res, students));
};

exports.getStudents = asyncHandler(getStudents);
