const { LanguageFilter, Project } = require('../../../shared/models');

const getTotalStat = async ($match) => {
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
  
  const [projects, files, codes, comments] = await Promise.all([
    Project.countDocuments($match),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments')
  ]);
  
  return { projects, files, codes, comments };
};

const getLanguages = async ($match) => {
  const $in = await _getAvailableLanguages();
  const getProjectTotal = async () => {
    const result = await Project.aggregate([
      { $match },
      { $unwind: '$meta' },
      { $match: { 'meta.language': { $in } } },
      { $group: { _id: { id: '$_id', language: '$meta.language' } } },
      { $group: { _id: { language: '$_id.language' }, count: { $sum: 1 } } },
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
  
  const [projects, files, codes, comments] = await Promise.all([
    getProjectTotal(),
    getTotal('$meta.files'),
    getTotal('$meta.codes'),
    getTotal('$meta.comments'),
  ]);
  
  return { projects, files, codes, comments };
};

const getProjects = async (filter) => {
  return await Project.find(filter).lean();
};

async function _getAvailableLanguages () {
  return (await LanguageFilter.find().lean()).map(({ name }) => name);
}

exports.getTotalStat = getTotalStat;
exports.getLanguages = getLanguages;
exports.getProjects = getProjects;
