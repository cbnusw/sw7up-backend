const { Project } = require('../../shared/models');

const migrateProjectModel = async () => {
  await Project.updateMany({}, { $set: { metaUpdating: false } });
  const projects = await Project.find({}).select('name metaUpdating');
  console.log(JSON.stringify(projects, null, 2));
};

module.exports = async () => {
  await migrateProjectModel();
};
