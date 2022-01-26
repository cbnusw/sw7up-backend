const multer = require('multer');
const { mkdirSync, existsSync, promises } = require('fs');
const { join, extname } = require('path');
const { v4 } = require('uuid');
const { ROOT_DIR } = require('../../shared/env');
const { ProjectFile } = require('../../shared/models');
const { debug, error } = require('../utils/logger');

const createUploader = (dir, useOriginalName = false) => {
  const absolutDir = join(ROOT_DIR, 'code-uploads', dir);
  if (!existsSync(absolutDir)) mkdirSync(absolutDir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, absolutDir);
    },
    filename: (req, file, cb) => {
      const filename = useOriginalName ? file.originalname : `${v4()}${extname(file.originalname)}`;
      cb(null, filename);
    }
  });

  return multer({ storage });
};

const difference = (arr1, arr2) => arr1.filter(v => !arr2.includes(v));

const removeFile = async id => {
  const file = await ProjectFile.findById(id);
  if (!file) return;

  try {
    const filePath = join(ROOT_DIR, 'code-uploads', file.path);
    await file.deleteOne();
    await promises.unlink(filePath);
  } catch (e) {
    error(e);
  }
};

const removeFiles = async (...ids) => await Promise.all(ids.map(removeFile));

const updateFiles = async (project, ...ids) => {
  const files = await ProjectFile.find({ project });
  const inDB = files.map(file => String(file._id));
  ids = ids.filter(id => !!id).map(id => String(id));
  const deletions = difference(inDB, ids);
  const additions = difference(ids, inDB);

  if (additions.length > 0) {
    await Promise.all(additions.map(_id => ProjectFile.updateOne({ _id }, { $set: { project } })));
    debug(`Update file instances: ${additions}`);
  }

  if (deletions.length > 0) {
    await removeFiles(deletions);
    debug(`Remove file instances: ${deletions}`);
  }
};

const removeAllProjectFiles = async projectId => {
  const path = join(ROOT_DIR, `code-uploads/code/static/projects/${projectId}`);
  await Promise.all([
    promises.rm(path, { recursive: true, force: true }),
    ProjectFile.deleteMany({ project: projectId })
  ]);
};

exports.createUpload = createUploader;
exports.removeFile = removeFile;
exports.removeFiles = removeFiles;
exports.updateFiles = updateFiles;
exports.removeAllProjectFiles = removeAllProjectFiles;
