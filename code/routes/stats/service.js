const { LanguageFilter, Project, StepUp, Topcit, TopcitStat } = require('../../../shared/models');

const getStats = async ($match) => {
  const $in = await _getAvailableLanguages();
  const getTotal = async ($sum) => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: null, count: { $sum } } }
    ]);
    return result[0]?.count || 0;
  };
  const getStudents = async () => {
    const result = await Project.aggregate([
      { $match },
      { $group: { _id: '$creator' } },
      { $group: { _id: null, count: { $sum: 1 } } }
    ]);
    
    return result[0]?.count || 1;
  };
  const [projects, files, codes, comments, students] = await Promise.all([
    Project.countDocuments($match),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments'),
    getStudents()
  ]);
  
  return { projects, files, codes, comments, students };
};

const getStatsByYears = async ($match) => {
  const $in = await _getAvailableLanguages();
  $match.$and = [{ year: { $ne: null } }, { semesterIndex: { $ne: null } }];
  const group = { year: '$year', semester: '$semesterIndex' };
  
  const getProjectTotal = async () => {
    const result = await Project.aggregate([{ $match }, { $group: { _id: group, count: { $sum: 1 } } }]);
    return result.reduce((acc, item) => {
      acc[`${item._id.year}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const getTotal = async ($sum) => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: group, count: { $sum } } }
    ]);
    return result.reduce((acc, item) => {
      acc[`${item._id.year}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const getStudents = async () => {
    const result = await Project.aggregate([
      { $match },
      { $group: { _id: { ...group, creator: '$creator' } } },
      { $group: { _id: { year: '$_id.year', semester: '$_id.semester' }, count: { $sum: 1 } } },
    ]);
    
    return result.reduce((acc, item) => {
      acc[`${item._id.year}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const [projects, files, codes, comments, students] = await Promise.all([
    getProjectTotal(),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments'),
    getStudents()
  ]);
  
  return { projects, files, codes, comments, students };
};

const getStatsByGrades = async ($match) => {
  const $in = await _getAvailableLanguages();
  $match.$and = [{ grade: { $ne: null } }, { semesterIndex: { $ne: null } }];
  const group = { grade: '$grade', semester: '$semesterIndex' };
  
  const getProjectTotal = async () => {
    const result = await Project.aggregate([{ $match }, { $group: { _id: group, count: { $sum: 1 } } }]);
    return result.reduce((acc, item) => {
      acc[`${item._id.grade}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const getTotal = async ($sum) => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: group, count: { $sum } } }
    ]);
    return result.reduce((acc, item) => {
      acc[`${item._id.grade}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const getStudents = async () => {
    const result = await Project.aggregate([
      { $match },
      { $group: { _id: { ...group, creator: '$creator' } } },
      { $group: { _id: { grade: '$_id.grade', semester: '$_id.semester' }, count: { $sum: 1 } } },
    ]);
    
    return result.reduce((acc, item) => {
      acc[`${item._id.grade}-${item._id.semester}`] = item.count;
      return acc;
    }, {});
  };
  const [projects, files, codes, comments, students] = await Promise.all([
    getProjectTotal(), getTotal('$meta.files'), getTotal('$meta.codes'), getTotal('$meta.comments'), getStudents()
  ]);
  
  return { projects, files, codes, comments, students };
};

const getStatsByDepartments = async ($match) => {
  const filters = {
    '소프트웨어': { ...$match, school: '충북대학교', department: { $in: ['소프트웨어학과', '소프트웨어학부'] } },
    '컴퓨터공학': { ...$match, school: '충북대학교', department: '컴퓨터공학과' },
    '정보통신': { ...$match, school: '충북대학교', department: '정보통신공학부' },
    '지능로봇': { ...$match, school: '충북대학교', department: '지능로봇공학과' },
    '기타': {
      ...$match,
      $or: [
        { school: { $ne: '충북대학교' } },
        {
          $and: [
            { school: '충북대학교' },
            { department: { $nin: ['소프트웨어학과', '소프트웨어학부', '컴퓨터공학과', '정보통신공학부', '지능로봇학과'] } }
          ]
        }
      ]
    }
  };
  
  const $in = await _getAvailableLanguages();
  
  const getProjectTotal = async () => {
    const results = await Promise.all(Object.keys(filters).map(async (key) => {
      const $match = filters[key];
      const result = await Project.aggregate([
        { $match },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      return { name: key, count: result[0]?.count || 0 };
    }));
    return results.reduce((acc, cur) => {
      acc[cur.name] = cur.count;
      return acc;
    }, {});
  };
  const getTotal = async ($sum) => {
    const results = await Promise.all(Object.keys(filters).map(async (key) => {
      const $match = filters[key];
      const result = await Project.aggregate([
        { $match },
        { $unwind: '$meta' },
        { $match: { 'meta.language': { $in } } },
        { $group: { _id: null, count: { $sum } } }
      ]);
      return { name: key, count: result[0]?.count || 0 };
    }));
    
    return results.reduce((acc, cur) => {
      acc[cur.name] = cur.count;
      return acc;
    }, {});
  };
  
  const getStudents = async () => {
    const results = await Promise.all(Object.keys(filters).map(async (key) => {
      const $match = filters[key];
      const result = await Project.aggregate([
        { $match },
        { $group: { _id: '$creator' } },
        { $group: { _id: null, count: { $sum: 1 } } }
      ]);
      return { name: key, count: result[0]?.count || 0 };
    }));
    
    return results.reduce((acc, cur) => {
      acc[cur.name] = cur.count;
      return acc;
    }, {});
  };
  
  const [projects, files, codes, comments, students] = await Promise.all([
    getProjectTotal(),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments'),
    getStudents(),
  ]);
  
  return { projects, files, codes, comments, students };
};

const getStudentProjectYears = async ($match) => {
  const result = await Project.aggregate([
    { $match },
    { $group: { _id: '$year' } }
  ]);
  return result.map(item => item._id).sort();
};

const getLanguages = async ($match) => {
  const $in = await _getAvailableLanguages();
  const getProjectTotal = async () => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: { id: '$_id', language: '$meta.language' } } },
      { $group: { _id: { language: '$_id.language' }, count: { $sum: 1 } } }
    ]);
    return result.reduce((acc, cur) => {
      acc[cur._id.language] = cur.count;
      return acc;
    }, {});
  };
  const getTotal = async (count) => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: { language: '$meta.language', count } } },
      { $group: { _id: { language: '$_id.language' }, count: { $sum: '$_id.count' } } }
    ]);
    return result.reduce((acc, cur) => {
      acc[cur._id.language] = cur.count;
      return acc;
    }, {});
  };
  const getStudents = async () => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: { creator: '$creator', language: '$meta.language' } } },
      { $group: { _id: { language: '$_id.language' }, count: { $sum: 1 } } }
    ]);
    
    return result.reduce((acc, cur) => {
      acc[cur._id.language] = cur.count;
      return acc;
    }, {});
  };
  
  const [projects, files, codes, comments, students] = await Promise.all([
    getProjectTotal(),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments'),
    getStudents(),
  ]);
  
  return { projects, files, codes, comments, students };
};

const getTopcitStats = async (filter) => {
  const documents = await TopcitStat.find(filter).lean();
  return documents.sort((a, b) => {
    if (a.category === '전국') return -1;
    if (b.category === '전국') return 1;
    if (a.category === '학교') return -1;
    if (b.category === '학교') return 1;
    return a.category <= b.category ? -1 : 1;
  });
};

const getTopcits = async (no) => {
  return Topcit.find({ 'student.no': no }).sort({ no: -1 }).lean();
};
const getStepUps = async (no) => {
  return StepUp.find({ no }).sort({ level: -1 }).lean();
};

async function _getAvailableLanguages () {
  return (await LanguageFilter.find().lean()).map(({ name }) => name);
}

exports.getStats = getStats;
exports.getStatsByYears = getStatsByYears;
exports.getStatsByGrades = getStatsByGrades;
exports.getStatsByDepartments = getStatsByDepartments;
exports.getStudentProjectYears = getStudentProjectYears;
exports.getLanguages = getLanguages;
exports.getTopcitStats = getTopcitStats;
exports.getTopcits = getTopcits;
exports.getStepUps = getStepUps;
