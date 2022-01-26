const schedule = require('node-schedule');
const { IS_DEV } = require('../../shared/env');
const { ProjectFile } = require('../../shared/models');
const { removeFiles } = require('../services/file.service');
const { debug } = require('../utils/logger');

module.exports = () => {
  const cron = IS_DEV ? '0 * * * * *' : '0 0 * * * *';
  return schedule.scheduleJob(cron, async () => {
    const date = new Date();

    if (IS_DEV) {
      date.setMinutes(date.getMinutes() - 60);
    } else {
      date.setDate(date.getDate() - 1);
    }

    const files = await ProjectFile.find({
      createdAt: { $lt: date },
      project: { $eq: null },
    });

    if (files.length > 0) {
      await removeFiles(...files.map(f => f._id));
      debug(`Remove unused files:\n${files.map(f => `\t${f._id} ${f.name} ${f.path}`).join('\n')}`);
    }
  });
};
