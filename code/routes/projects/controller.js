const archiver = require('archiver');
const axios = require('axios');
const asyncHandler = require('express-async-handler');
const { Types } = require('mongoose');
const { join, basename } = require('path');
const { promises, existsSync, createWriteStream } = require('fs');
const { ROOT_DIR } = require('../../../shared/env');
const {
  FORBIDDEN, GITHUB_ACCOUNT_NOT_FOUND, PROJECT_NOT_FOUND,
  PROJECT_FILE_NOT_FOUND, CAT_NOT_READ_SOURCE_FILE,
} = require('../../../shared/errors');
const { GithubAccount, Project, ProjectFile, UserInfo } = require('../../../shared/models');
const { createResponse } = require('../../../shared/utils/response');
const { exec } = require('child_process');
const { getCommitInfo } = require('./service');
const { removeAllProjectFiles, updateFiles } = require('../../services/file.service');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';

const getGithubProjects = async (req, res) => {
  const { params: { accountId }, user } = req;
  
  let repos = [];
  let length = -1;
  let page = 1;
  
  const account = await GithubAccount.findById(accountId);
  
  if (!account) throw GITHUB_ACCOUNT_NOT_FOUND;
  if (String(account.user) !== String(user.info)) throw FORBIDDEN;
  
  const { accessToken } = account;
  
  while (repos.length !== length) {
    length = repos.length;
    const reposResponse = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Accept: 'application/vnd.github.v3+json', Authorization: `token ${accessToken}`, 'User-Agent': USER_AGENT,
      }, params: {
        per_page: 100, page, type: 'public'
      }
    });
    
    const { data } = reposResponse;
    
    for (let repo of data) {
      const project = await Project.findOne({ isPublic: true, 'repo.url': repo.svn_url });
      const commits = await getCommitInfo(accessToken, repo);
      
      if (!project) {
        const username = repo.owner.login;
        let owner = await GithubAccount.findOne({ username });
        if (!owner) owner = await GithubAccount.create({ username });
        
        repos.push({
          url: repo.svn_url,
          fullName: repo.full_name,
          name: repo.name,
          description: repo.description,
          size: repo.size,
          owner,
          commits,
          createdAt: repo.created_at,
          updatedAt: repo.updated_at,
        });
      }
    }
    
    page++;
  }
  
  res.json(createResponse(res, repos));
};

const search = async (req, res) => {
  const { query } = req;
  const data = await Project.search(query);
  res.json(createResponse(res, data));
};

const countProjects = async (req, res) => {
  const { query } = req;
  const count = await Project.countAll(query);
  res.json(createResponse(res, count));
};

const countProjectMetaInfo = async (req, res) => {
  const { query: { isPublic, groupByLanguage, metaName } } = req;
  const $match = {};
  const $unwind = '$meta';
  const $group = { _id: null, 'count': { $sum: `$meta.${metaName}` } };
  
  if (isPublic === 'true' || isPublic === 'false') $match.isPublic = isPublic === 'true';
  if (groupByLanguage === 'true') $group._id = { 'language': '$meta.language' };
  
  const data = await Project.aggregate([{ $match }, { $unwind }, { $group }]);
  if (groupByLanguage !== 'true') {
    const { count } = data[0] || { count: 0 };
    return res.json(createResponse(res, count));
  } else if (data.length > 0) {
    res.json(createResponse(res, data.map(item => {
      const { _id: { language }, count } = item;
      return { language, count };
    })));
  } else {
    res.json(createResponse(res, []));
  }
};

const searchMyProjects = async (req, res) => {
  const { query, user } = req;
  const data = await Project.search(query, { creator: user.info });
  res.json(createResponse(res, data));
};

const countMyProjects = async (req, res) => {
  const { query, user } = req;
  const count = await Project.countAll(query, { creator: user.info });
  res.json(createResponse(res, count));
};

const countMyProjectMetaInfo = async (req, res) => {
  const { query: { isPublic, groupByLanguage, metaName }, user } = req;
  const $match = { creator: Types.ObjectId(user.info) };
  const $unwind = '$meta';
  const $group = { _id: null, 'count': { $sum: `$meta.${metaName}` } };
  
  if (isPublic === 'true' || isPublic === 'false') $match.isPublic = isPublic === 'true';
  if (groupByLanguage === 'true') $group._id = { 'language': '$meta.language' };
  
  const data = await Project.aggregate([{ $match }, { $unwind }, { $group }]);
  if (groupByLanguage !== 'true') {
    const { count } = data[0] || { count: 0 };
    return res.json(createResponse(res, count));
  } else if (data.length > 0) {
    res.json(createResponse(res, data.map(item => {
      const { _id: { language }, count } = item;
      return { language, count };
    })));
  } else {
    res.json(createResponse(res, []));
  }
};

const getProject = async (req, res) => {
  const { params: { id } } = req;
  
  const document = await Project.findById(id)
    .populate({ path: 'banners.file' })
    .populate({ path: 'documents.file' })
    .populate({ path: 'team.member.joined', model: UserInfo })
    .populate({ path: 'team.member.github', populate: { path: 'user', model: UserInfo } })
    .populate({ path: 'creator', model: UserInfo });
  
  if (!document) throw PROJECT_NOT_FOUND;
  
  res.json(createResponse(res, document));
};

const downloadProject = async (req, res) => {
  const { params: { id } } = req;
  const path = join(ROOT_DIR, `code-uploads/code/static/projects/${id}`);
  const result = await promises.readdir(join(path, 'sources'));
  const filename = result[0] ? `${result[0]}.zip` : 'source.zip';
  const output = createWriteStream(join(path, filename));
  const archive = archiver('zip');
  output.on('close', () => {
    res.download(join(path, filename), filename);
  });
  archive.on('error', err => console.error(err));
  archive.pipe(output);
  archive.directory(join(path, 'sources'), false);
  archive.finalize();
};

const getProjectCodeText = async (req, res) => {
  const { params: { id } } = req;
  const file = await ProjectFile.findById(id);
  if (!file) throw PROJECT_FILE_NOT_FOUND;
  try {
    const source = (await promises.readFile(join(ROOT_DIR, file.path))).toString('utf-8');
    res.json(createResponse(res, { name: file.name, path: file.path, source }));
  } catch (err) {
    throw CAT_NOT_READ_SOURCE_FILE;
  }
};

const createProjectId = (req, res) => res.json(createResponse(res, Types.ObjectId()));

const createProject = async (req, res) => {
  const { body, user } = req;
  
  convertBodyToProject(body);
  const ids = [...getFileIdsFromProject(body), ...await moveTemporarySources(body)];
  await addMeToTeam(body, user);
  
  body.creator = user.info;
  
  const document = await Project.create(body);
  await updateFiles(document._id, ...ids);
  const sourceDir = join(ROOT_DIR, `code-uploads/code/static/projects/${document._id}/sources`);
  document.meta = await analysisSource(sourceDir);
  await document.save();
  
  res.json(createResponse(res, document, 201));
};

const updateProject = async (req, res) => {
  const { params: { id }, body: $set, user } = req;
  
  const document = await Project.findById(id);
  if (!document) throw PROJECT_NOT_FOUND;
  if (String(document.creator) !== user.info) throw FORBIDDEN;
  
  convertBodyToProject($set);
  const ids = [...getFileIdsFromProject($set), ...await moveTemporarySources($set)];
  await addMeToTeam($set, user);
  const sourceDir = join(ROOT_DIR, `code-uploads/code/static/projects/${document._id}/sources`);
  $set.meta = await analysisSource(sourceDir);
  await Promise.all([
    document.updateOne({ $set }), updateFiles(document._id, ...ids)
  ]);
  res.json(createResponse(res));
};

const approve = async (req, res) => {
  const { params: { id } } = req;
  const approvedAt = new Date();
  const document = await Project.findById(id);
  if (!document) throw PROJECT_NOT_FOUND;
  document.approvedAt = approvedAt;
  await document.save();
  res.json(createResponse(res, { approvedAt }));
};

async function addMeToTeam (body, user) {
  if (body.team) {
    if (body.isPublic) {
      const githubAccount = await GithubAccount.findOne({ user: user.info });
      if (!githubAccount) throw GITHUB_ACCOUNT_NOT_FOUND;
      body.team.member.github = body.team.github || [];
      const me = body.team.member.github.find(m => String(m) === String(githubAccount._id));
      if (!me) body.team.member.github.push(githubAccount._id);
    } else {
      body.team.member.joined = body.team.member.joined || [];
      const me = body.team.member.joined?.find(m => String(m) === String(user.info));
      if (!me) body.team.member.joined.push(user.info);
    }
  }
}

function convertBodyToProject (body) {
  const { team, repo } = body;
  
  if (team?.member?.github) team.member.github = team.member.github.map(m => m._id || m);
  if (team?.member?.joined) team.member.joined = team.member.joined.map(m => m._id || m);
  if (repo?.commitInfo) repo.commitInfo = repo.commitInfo.map(info => {
    info.committer = info.committer?._id || info.committer;
    return info;
  });
  
  body.banners = (body.banners || []).map(banner => {
    if (banner.file) banner.file = banner.file._id || banner.file;
    return banner;
  });
  
  body.documents = (body.documents || []).map(document => {
    document.file = document.file && document.file._id || document.file;
    return document;
  });
}

function flatTracedEntries (entries, files) {
  entries.forEach(entry => {
    if ('dirname' in entry) {
      flatTracedEntries(entry.entries, files);
    } else {
      files.push(entry);
    }
  });
}

async function moveTemporarySources (body) {
  const files = [];
  const ids = [];
  const id = body._id;
  flatTracedEntries(body.source || [], files);
  for (let file of files) {
    if (file.path.startsWith(`code-uploads/code/static/projects/${id}/sources`)) {
      ids.push(file._id);
      continue;
    }
    const path = file.path.replace(`/${id}/temp-sources/`, `/${id}/sources/`);
    const tempFile = await ProjectFile.findOne({ path: file.path });
    const sourceFile = await ProjectFile.findOne({ path });
    if (sourceFile) await sourceFile.deleteOne();
    if (tempFile) await tempFile.deleteOne();
    const fileDocument = await ProjectFile.create({ ...file, path });
    file.path = path;
    ids.push(fileDocument._id);
  }
  
  const tempDir = join(ROOT_DIR, `code-uploads/code/static/projects/${id}/temp-sources`);
  const srcDir = join(ROOT_DIR, `code-uploads/code/static/projects/${id}/sources`);
  if (existsSync(tempDir)) {
    await promises.cp(tempDir, srcDir, { recursive: true });
    await promises.rm(tempDir, { recursive: true, force: true });
  }
  return ids;
}

function getFileIdsFromProject (project) {
  return [
    ...project.banners.map(banner => banner.file?._id || banner.file).filter(id => !!id),
    ...project.documents.map(document => document.file._id || document.file).filter(id => !!id)
  ];
}

const createLocalProject = async (req, res) => {
  const { body, user } = req;
  const project = convertBodyToLocalProject(body);
  const ids = getFileIdFromPublicProject(project);
  
  if (project.team) {
    const me = project.team.members.find(member => String(member) === String(user.info));
    if (!me) project.team.members.push(user.info);
  }
  
  project.creator = user.info;
  
  const document = await LocalProject.create(project);
  await updateFiles(document._id, 'LocalProject', ...ids);
  const sourcePath = join(ROOT_DIR, `code-uploads/code/static/projects/${document._id}`);
  document.meta = await analysisSource(sourcePath);
  await document.save();
  
  res.json(createResponse(res, document, 201));
};

const createPublicProject = async (req, res) => {
  const { body, user } = req;
  body.creator = user.info;
  body.team = (body.commits || []).map(item => item.member.user).filter(user => !!user);
  
  convertBodyToPublicProject(body);
  
  const ids = getFileIdFromPublicProject(project);
  const sourceDir = join(ROOT_DIR, `code-uploads/code/static/projects/${document._id}`);
  body.sourceDir = sourceDir;
  
  await clone(body.repo.url, sourceDir);
  const source = [];
  await tranceFiles(sourceDir, source);
  project.source = source;
  project.sourceDir = sourceDir;
  project.meta = await analysisSource(sourceDir);
  
  const document = await PublicProject.create(project);
  await updateFiles(document._id, 'PublicProject', ...ids);
  res.json(createResponse(res, document, 201));
};

const updateLocalProject = async (req, res) => {
  const { params: { id }, body, user } = req;
  
  const document = await LocalProject.findById(id);
  
  if (!document) throw LOCAL_PROJECT_NOT_FOUND;
  if (String(document.creator) !== String(user.info)) throw FORBIDDEN;
  
  const $set = convertBodyToLocalProject(body);
  const ids = getFileIdFromLocalProject($set);
  
  if ($set.team) {
    const me = $set.team.members.find(member => String(member) === String(user.info));
    if (!me) $set.team.members.push(user.info);
  }
  
  await Promise.all([document.updateOne({ $set }), updateFiles(document._id, 'LocalProject', ...ids)]);
  
  const sourcePath = join(ROOT_DIR, `code-uploads/code/static/projects/${document._id}`);
  document.meta = await analysisSource(sourcePath);
  await document.save();
  
  res.json(createResponse(res));
};

const removeProject = async (req, res) => {
  const { params: { id }, user } = req;
  const document = await Project.findById(id);
  
  if (!document) throw PROJECT_NOT_FOUND;
  if (String(document.creator) !== String(user._id)) throw FORBIDDEN;
  
  await Promise.all([document.deleteOne(), removeAllProjectFiles(document._id)]);
  
  res.json(createResponse(res));
};

const removeTemporarySources = async (req, res) => {
  const { params: { id } } = req;
  const tempDir = join(ROOT_DIR, `code-uploads/code/static/projects/${id}/temp-sources`);
  if (existsSync(tempDir)) await promises.rm(tempDir, { recursive: true, force: true });
  await ProjectFile.deleteMany({ _id: id, temporary: true });
  res.json(createResponse(res));
};

function getFileIdFromPublicProject (project) {
  function convert (entries, files) {
    (entries || []).forEach(e => 'dirname' in e ? convert(e.entries, files) : files.push(e._id || e));
  }
  
  const sourceFiles = [];
  convert(project.source, sourceFiles);
  
  return [
    ...project.banners.filter(banner => banner.file).map(banner => banner.file._id || banner.file), ...sourceFiles, ...project.documents.filter(document => document.file).map(document => document.file._id || document.file)
  ];
}

async function tranceFiles (path, entry) {
  const bn = basename(path);
  
  const s = await promises.stat(path);
  if (s.isDirectory()) {
    const entries = [];
    entry.push({ dirname: bn, entries });
    tranceFiles(`${path}/${bn}`, entries);
  } else {
    entry.push({ name: bn });
  }
}

function clone (url, dirPath) {
  return new Promise((resolve, reject) => {
    exec(`git clone ${url} ${dirPath}`, (err, stdout, stderr) => {
      if (err) reject(err); else if (stderr) reject(stderr); else {
        resolve();
      }
    });
  });
}

function analysisSource (sourcePath) {
  const filterList = [/^__.+__$/, /JSON/, /YAML/, /TOML/];
  return new Promise((resolve, reject) => {
    exec(`pygount --format=summary ${sourcePath}`, (err, stdout, stderr) => {
      if (err) reject(err); else if (stderr) reject(stderr); else {
        let lines = stdout.split('\n');
        lines = lines.slice(2, lines.length - 3);
        const meta = lines.map(line => {
          const [language, files, , codes, , comments] = line.split(/\s+/).filter(i => !!i);
          return {
            language, files: +files, codes: +codes, comments: +comments
          };
        }).filter(m => !filterList.some(filter => filter.test(m.language)));
        console.log(meta);
        resolve(meta);
      }
    });
  });
}

exports.getGithubProjects = asyncHandler(getGithubProjects);
exports.search = asyncHandler(search);
exports.countProjects = asyncHandler(countProjects);
exports.countProjectMetaInfo = asyncHandler(countProjectMetaInfo);
exports.searchMyProjects = asyncHandler(searchMyProjects);
exports.countMyProjects = asyncHandler(countMyProjects);
exports.countProjectMetaInfo = asyncHandler(countProjectMetaInfo);
exports.countMyProjectMetaInfo = asyncHandler(countMyProjectMetaInfo);
exports.getProject = asyncHandler(getProject);
exports.downloadProject = asyncHandler(downloadProject);
exports.getProjectCodeText = asyncHandler(getProjectCodeText);
exports.createProjectId = createProjectId;
exports.createProject = asyncHandler(createProject);
exports.updateProject = asyncHandler(updateProject);
exports.approve = asyncHandler(approve);
exports.removeProject = asyncHandler(removeProject);
exports.removeTemporarySources = asyncHandler(removeTemporarySources);
