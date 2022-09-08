const archiver = require('archiver');
const asyncHandler = require('express-async-handler');
const { promises, createWriteStream } = require('fs');
const mime = require('mime');
const { Types } = require('mongoose');
const { join } = require('path');
const { ROOT_DIR } = require('../../../shared/env');
const { GithubAccount, Project, ProjectFile, UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { toRegEx } = require('../../../shared/models/mappers');
const {
  CAN_NOT_READ_SOURCE_FILE, FORBIDDEN, GITHUB_ACCOUNT_NOT_FOUND, PROJECT_FILE_NOT_FOUND, PROJECT_NOT_FOUND
} = require('../../../shared/errors');
const { OPERATOR_ROLES } = require('../../../shared/constants');
const {
  cloneSourceFilesToTempDir,
  moveSourceCodesFromTempDir,
  convertDirToEntries,
  analyzeSource,
  getCommitInfo,
  getProjectSourceDir,
  removeProjectSourceTempDir,
  removeProjectSourceFiles,
  removeFile
} = require('./services');

async function createCountAndSearchPipelines (query, queryKeys) {
  const { q, sort = '_id:-1', limit = 12 } = query;
  const $match = {};
  const $sort = {};
  
  delete query.q;
  delete query.sort;
  delete query.limit;
  
  Object.keys(query).forEach(key => {
    $match[key] = query[key];
  });
  
  if (q && (queryKeys || []).length > 0) {
    $match['$or'] = await Promise.all(queryKeys.map(async key => {
      const filter = {};
      if (key === 'creator') {
        const $in = (await UserInfo.find({ name: toRegEx(q) }).select('_id').lean()).map(doc => doc._id);
        filter[key] = { $in };
      } else {
        filter[key] = toRegEx(q);
      }
      
      return filter;
    }));
  }
  
  const count = [{ $match: { ...$match } }, { $count: 'total' }];
  
  const chunks = sort.split(':');
  const [_sortKey, direction] = chunks;
  let marker = chunks.slice(2).join(':');
  if (marker) {
    if (_sortKey === '_id') marker = new Types.ObjectId(marker);
    console.log(typeof marker);
    $match[_sortKey] = +direction === 1 ? { $gt: marker } : { $lt: marker };
  }
  $sort[_sortKey] = +direction;
  
  const search = [{ $match }, { $sort }, { $limit: +limit }];
  
  return [count, search];
}

async function search (query, queryKeys = ['name', 'department', 'creator']) {
  const [count, search] = await createCountAndSearchPipelines(query, queryKeys);
  console.log(JSON.stringify(search[0], null, 2));
  console.log(JSON.stringify(search[2], null, 2));
  const { total } = (await Project.aggregate(count).allowDiskUse(true))[0] || { total: 0 };
  let documents = await Project.aggregate(search).allowDiskUse(true);
  documents = await Project.populate(documents, { path: 'creator', model: UserInfo });
  documents = await Project.populate(documents, { path: 'banners.file', model: ProjectFile });
  return { total, documents };
}

const successResponse = (req, res) => res.json(createResponse(res));

const getProjects = async (req, res) => {
  const { query } = req;
  const data = await search({ ...query, source: { $ne: null } });
  console.log(JSON.stringify(data.documents.map(d => d._id), null, 2));
  res.json(createResponse(res, data));
};

const getMyProjects = async (req, res) => {
  const { query, user } = req;
  const data = await search({ ...query, source: { $ne: null }, creator: new Types.ObjectId(user.info) }, ['name']);
  
  res.json(createResponse(res, data));
};

const getMyNoneSourceProjects = async (req, res) => {
  const { query, user } = req;
  const data = await search({ ...query, source: { $eq: null }, creator: new Types.ObjectId(user.info) }, ['name']);
  
  res.json(createResponse(res, data));
};

const getProjectSourceCode = async (req, res) => {
  const { params: { id } } = req;
  const file = await ProjectFile.findById(id);
  if (!file) throw PROJECT_FILE_NOT_FOUND;
  
  try {
    const path = join(ROOT_DIR, file.path);
    const source = (await promises.readFile(path)).toString('utf-8');
    res.json(createResponse(res, { name: file.name, path: file.path, source }));
  } catch (err) {
    throw CAN_NOT_READ_SOURCE_FILE;
  }
};

const getProject = async (req, res) => {
  const { params: { id } } = req;
  const document = await Project.findById(id)
    .populate({ path: 'banners.file' })
    .populate({ path: 'documents.file' })
    .populate({ path: 'repo.owner', populate: [{ path: 'user', model: UserInfo }] })
    .populate({ path: 'repo.commitInfo.committer', populate: [{ path: 'user', model: UserInfo }] })
    .populate({ path: 'team.member.joined', model: UserInfo })
    .populate({ path: 'team.member.github', populate: [{ path: 'user', model: UserInfo }] })
    .populate({ path: 'creator', model: UserInfo }).lean();
  
  if (!document) {
    throw PROJECT_NOT_FOUND;
  }
  
  res.json(createResponse(res, document));
};

const downloadSourceFiles = async (req, res) => {
  const { params: { id } } = req;
  const dir = getProjectSourceDir(id);
  const basenames = await promises.readdir(dir);
  const filename = `${basenames[0] ? basenames[0] : 'source'}.zip`;
  const zipPath = join(dir, filename);
  const output = createWriteStream(zipPath);
  const archive = archiver('zip');
  output.on('close', () => {
    res.download(zipPath, filename);
  });
  archive.on('error', err => {
    console.error(err);
    res.status(500).json(err);
  });
  archive.pipe(output);
  archive.directory(join(dir, basenames[0]), false);
  archive.finalize();
};

const downloadDocument = async (req, res) => {
  const { params: { id } } = req;
  const file = await ProjectFile.findById(id);
  
  if (!file) throw PROJECT_FILE_NOT_FOUND;
  
  const path = join(ROOT_DIR, file.path);
  
  res.download(path, file.name);
};

const createProject = async (req, res) => {
  const { body, user } = req;
  
  body.creator = user.info;
  
  const project = await Project.create(body);
  
  res.json(createResponse(res, project));
};

const uploadBanners = async (req, res) => {
  const { params: { id }, files, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  const banners = await Promise.all(files.map(file => ProjectFile.create({
    path: `code-uploads/code/static/projects/${id}/banners/${file.filename}`,
    name: file.originalname,
    type: file.type || mime.getType(file.originalname),
    project: id,
    fileType: 'banner',
    size: file.size,
    creator: project.creator,
  })));
  
  project.banners = [...(project.banners || []), ...banners.map(banner => ({ file: banner._id }))];
  await project.save();
  
  res.json(createResponse(res, banners, 201));
};

const addDocument = async (req, res) => {
  const { params: { id }, file, body: { name }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== user.info) throw FORBIDDEN;
  
  const document = {
    name, file: await ProjectFile.create({
      path: `code-uploads/code/static/projects/${id}/documents/${file.filename}`,
      name: file.originalname,
      type: file.type || mime.getType(file.originalname),
      project: id,
      fileType: 'document',
      size: file.size,
      creator: project.creator,
    }),
  };
  
  project.documents = project.documents || [];
  project.documents.push({ name: document.name, file: document.file._id });
  await project.save();
  
  res.json(createResponse(res, document));
};

const updateBasic = async (req, res) => {
  const { params: { id }, body, user } = req;
  
  const document = await Project.findById(id);
  
  if (!document) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(document.creator) !== user.info) throw FORBIDDEN;
  
  const { name, department, grade, year, semester, description, projectType, subject, ownProject } = body;
  const $set = { name, department, grade, year, semester, description, projectType, subject, ownProject };
  
  await document.updateOne({ $set });
  
  res.json(createResponse(res));
};

const applyUploadSourceFiles = async (req, res) => {
  const { params: { id }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  await moveSourceCodesFromTempDir(id);
  
  const entries = [];
  const dir = getProjectSourceDir(id);
  await convertDirToEntries(id, dir, entries, user.info);
  project.repo = null;
  project.isPublic = false;
  project.source = entries;
  await project.save();
  await analyzeSource(id);
  res.json(createResponse(res));
};

const cloneSourceFiles = async (req, res) => {
  const { params: { id }, body: { repo, account }, user } = req;
  const githubAccount = await GithubAccount.findById(account).lean();
  const project = await Project.findById(id);
  
  if (!githubAccount) throw GITHUB_ACCOUNT_NOT_FOUND;
  if (!project) throw PROJECT_NOT_FOUND;
  if (String(githubAccount.user) !== String(user.info)) throw FORBIDDEN;
  if (String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  await cloneSourceFilesToTempDir(id, repo.url);
  await moveSourceCodesFromTempDir(id);
  const entries = [];
  const dir = getProjectSourceDir(id);
  const [_, commitInfo] = await Promise.all([
    convertDirToEntries(id, dir, entries, project.creator), getCommitInfo(githubAccount.accessToken, repo.fullName)
  ]);
  repo.commitInfo = commitInfo;
  project.isPublic = true;
  project.repo = repo;
  project.source = entries;
  await project.save();
  await analyzeSource(id);
  res.json(createResponse(res));
};

const removeSourceFiles = async (req, res) => {
  const { params: { id }, body, user } = req;
  
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  await removeProjectSourceFiles(id, body);
  const dir = getProjectSourceDir(id);
  const entries = [];
  await convertDirToEntries(id, dir, entries, project.creator);
  project.source = entries;
  await project.save();
  await analyzeSource(id);
  res.json(createResponse(res));
};

const addVideoBanner = async (req, res) => {
  const { params: { id }, body: { link }, user } = req;
  
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.banners.push({ link });
  await project.save();
  
  res.json(createResponse(res));
};

const updateTeamName = async (req, res) => {
  const { params: { id }, body: { name }, user } = req;
  
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team, name };
  await project.save();
  
  res.json(createResponse(res));
};

const addJoinedTeamMember = async (req, res) => {
  const { params: { id }, body: { memberId }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  project.team.member.joined = [...(project.team.member.joined || [])];
  
  if (!project.team.member.joined.find(m => String(m._id) === String(memberId))) {
    project.team.member.joined.push(memberId);
    await project.save();
  }
  
  res.json(createResponse(res));
};

const removeJoinedTeamMember = async (req, res) => {
  const { params: { id }, body: { memberId }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  project.team.member.joined = [...(project.team.member.joined || [])];
  
  const index = project.team.member.joined.findIndex(m => String(m._id) === String(memberId));
  if (index !== -1) {
    project.team.member.joined.splice(index, 1);
    await project.save();
  }
  
  res.json(createResponse(res));
};

const addGitHubTeamMembers = async (req, res) => {
  const { params: { id }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  
  project.team.member.github = (project.repo.commitInfo || []).map(info => info.committer);
  await project.save();
  
  res.json(createResponse(res));
};

const removeGitHubTeamMember = async (req, res) => {
  const { params: { id }, body: { memberId }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  project.team.member.github = [...(project.team.member.github || [])];
  
  const index = project.team.member.github.findIndex(m => String(m._id) === String(memberId));
  if (index !== -1) {
    project.team.member.github.splice(index, 1);
    await project.save();
  }
  
  res.json(createResponse(res));
};

const addNotJoinedTeamMember = async (req, res) => {
  const { params: { id }, body: { member }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  project.team.member.notJoined = [...(project.team.member.notJoined || [])];
  if (!project.team.member.notJoined.find(m => m.school === member.school && m.no === member.no)) {
    project.team.member.notJoined.push(member);
    await project.save();
  }
  
  res.json(createResponse(res));
};

const removeNotJoinedTeamMember = async (req, res) => {
  const { params: { id }, body: { index }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.team = { ...project.team };
  project.team.member = { ...project.team.member };
  project.team.member.notJoined = [...(project.team.member.notJoined || [])];
  project.team.member.notJoined.splice(index, 1);
  await project.save();
  
  res.json(createResponse(res));
};

const addOss = async (req, res) => {
  const { params: { id }, body: { name, link, license, description }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.ossList = project.ossList || [];
  project.ossList.push({ name, link, license, description });
  await project.save();
  
  res.json(createResponse(res));
};

const removeOss = async (req, res) => {
  const { params: { id }, body: { index }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  project.ossList.splice(index, 1);
  await project.save();
  
  res.json(createResponse(res));
};

const removeDocument = async (req, res) => {
  const { params: { id }, body: { index }, user } = req;
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  const fileId = project.documents[index].file;
  
  project.documents.splice(index, 1);
  await Promise.all([removeFile(id, fileId), project.save()]);
  
  res.json(createResponse(res));
};

const removeSourceTempDir = async (req, res) => {
  const { params: { id }, user } = req;
  const project = await Project.findById(id).lean();
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  await removeProjectSourceTempDir(id);
  res.json(createResponse(res));
};

const removeBanner = async (req, res) => {
  const { params: { id }, body: { index }, user } = req;
  
  const project = await Project.findById(id);
  
  if (!project) throw PROJECT_NOT_FOUND;
  if (!OPERATOR_ROLES.includes(user.role) && String(project.creator) !== String(user.info)) throw FORBIDDEN;
  
  const promises = [];
  const banner = project.banners[index];
  
  if (banner && banner.file) {
    promises.push(removeFile(id, banner.file));
  }
  
  if (banner) {
    project.banners.splice(index, 1);
    promises.push(project.save());
  }
  
  await Promise.all(promises);
  
  res.json(createResponse(res));
};

exports.succssResponse = successResponse;
exports.getProjects = asyncHandler(getProjects);
exports.getMyProjects = asyncHandler(getMyProjects);
exports.getMyNoneSourceProjects = asyncHandler(getMyNoneSourceProjects);
exports.getProjectSourceCode = asyncHandler(getProjectSourceCode);
exports.downloadDocument = asyncHandler(downloadDocument);
exports.getProject = asyncHandler(getProject);
exports.downloadSourceFiles = asyncHandler(downloadSourceFiles);
exports.createProject = asyncHandler(createProject);
exports.uploadBanners = asyncHandler(uploadBanners);
exports.addDocument = asyncHandler(addDocument);
exports.updateBasic = asyncHandler(updateBasic);
exports.applyUploadSourceFiles = asyncHandler(applyUploadSourceFiles);
exports.cloneSourceFiles = asyncHandler(cloneSourceFiles);
exports.removeSourceFiles = asyncHandler(removeSourceFiles);
exports.addVideoBanner = asyncHandler(addVideoBanner);
exports.updateTeamName = asyncHandler(updateTeamName);
exports.addJoinedTeamMember = asyncHandler(addJoinedTeamMember);
exports.removeJoinedTeamMember = asyncHandler(removeJoinedTeamMember);
exports.addGitHubTeamMembers = asyncHandler(addGitHubTeamMembers);
exports.removeGitHubTeamMember = asyncHandler(removeGitHubTeamMember);
exports.addNotJoinedTeamMember = asyncHandler(addNotJoinedTeamMember);
exports.removeNotJoinedTeamMember = asyncHandler(removeNotJoinedTeamMember);
exports.addOss = asyncHandler(addOss);
exports.removeOss = asyncHandler(removeOss);
exports.removeDocument = asyncHandler(removeDocument);
exports.removeSourceTempDir = asyncHandler(removeSourceTempDir);
exports.removeBanner = asyncHandler(removeBanner);
