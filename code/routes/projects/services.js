const { exec } = require('child_process');
const { existsSync, promises } = require('fs');
const clone = require('git-clone/promise');
const mime = require('mime');
const { join } = require('path');
const { ROOT_DIR } = require('../../../shared/env');
const { GithubAccount, Project, ProjectFile, UserInfo } = require('../../../shared/models');
const axios = require('axios');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';

const getProjectDir = projectId => join(ROOT_DIR, 'code-uploads/code/static/projects', projectId);

const getProjectSourceTempDir = projectId => {
  const projectDir = getProjectDir(projectId);
  return join(projectDir, 'temp-sources');
};

const getProjectSourceDir = projectId => {
  const projectDir = getProjectDir(projectId);
  return join(projectDir, 'sources');
};

const getCommitInfo = async (accessToken, fullName) => {
  let usernames = [];
  let length = -1;
  let page = 1;
  while (usernames.length !== length) {
    length = usernames.length;
    const response = await axios.get(
      `https://api.github.com/repos/${fullName}/commits`,
      {
        headers: {
          Accept: 'application/vnd.github.v3+json',
          Authorization: `token ${accessToken}`,
          'User-Agent': USER_AGENT,
        },
        params: { page, per_page: 100 }
      }
    );
    
    const { data } = response;
    usernames = [
      ...usernames,
      ...data.map(item => item.author?.login || item.commit?.author?.name).filter(username => !!username)
    ];
    page++;
  }
  
  const commitObj = usernames.reduce((acc, username) => {
    acc[username] = (acc[username] || 0) + 1;
    return acc;
  }, {});
  
  return await Promise.all(
    Object.keys(commitObj).map(async username => {
      let account = await GithubAccount.findOne({ username })
        .populate({ path: 'user', model: UserInfo })
        .select('-accessToken')
        .lean();
      if (!account) account = await GithubAccount.create({ username });
      return { committer: account._id, numOfCommits: commitObj[username] };
    })
  );
};

const removeProjectSourceTempDir = async projectId => {
  const tempDir = getProjectSourceTempDir(projectId);
  if (existsSync(tempDir)) await promises.rm(temDir, { recursive: true, force: true });
};

const removeProjectSourceDir = async projectId => {
  const sourceDir = getProjectSourceDir(projectId);
  const _promises = [];
  if (existsSync(sourceDir)) _promises.push(promises.rm(sourceDir, { recursive: true, force: true }));
  _promises.push(ProjectFile.deleteMany({ project: projectId, fileType: 'source' }));
  await Promise.all(_promises);
};

const removeFile = async (projectId, fileId) => {
  const file = await ProjectFile.findById(fileId);
  if (!file) return;
  
  if (String(file.project) === String(projectId)) {
    const path = join(ROOT_DIR, file.path);
  
    await Promise.all([
      file.deleteOne(),
      existsSync(path) && promises.rm(path)
    ]);
  }
};

const removeSourceFiles = async (projectId, fileIds) => {
  const files = await ProjectFile.find({ _id: { $in: fileIds }, fileType: 'source', project: projectId }).lean();
  const filePaths = files.map(file => join(ROOT_DIR, file.path));
  await Promise.all([
    ProjectFile.deleteMany({ _id: { $in: files.map(file => file._id) } }),
    ...filePaths.map(async path => existsSync(path) && await promises.rm(path))
  ]);
};

const cloneSourceCodesToTempDir = async (projectId, repoUrl) => {
  try {
    const chunks = repoUrl.split('/');
    const projectName = chunks[chunks.length - 1].replace(/\.git$/, '');
    const tempDir = getProjectSourceTempDir(projectId);
    const cloneDir = join(tempDir, projectName);
    await removeProjectSourceTempDir(projectId);
    await clone(repoUrl, cloneDir);
  } catch (e) {
    await removeProjectSourceTempDir(projectId);
    throw e;
  }
};

const moveSourceCodesFromTempDir = async projectId => {
  const sourceDir = getProjectSourceDir(projectId);
  const tempDir = getProjectSourceTempDir(projectId);
  
  await removeProjectSourceDir(projectId);
  
  await promises.rename(tempDir, sourceDir);
};

const _convertDirToEntries = async (projectId, dir, entries, userInfoId) => {
  const basenames = await promises.readdir(dir);
  await Promise.all(basenames.map(async name => {
    const p = `${dir}/${name}`;
    const stat = await promises.stat(p);
    if (stat.isDirectory()) {
      const _entries = [];
      entries.push({ dirname: name, entries: _entries });
      await convertDirToEntries(projectId, p, _entries, userInfoId);
    } else {
      const path = p.replace(`${ROOT_DIR}/`, '');
      let file = await ProjectFile.findOne({ path }).lean();
      if (!file) {
        file = await ProjectFile.create({
          path,
          name,
          size: stat.size,
          type: mime.getType(p),
          creator: userInfoId,
          project: projectId,
          fileType: 'source',
        });
      }
      entries.push(await ProjectFile.findById(file._id).lean());
    }
  }));
  
  entries.sort((e1, e2) => {
    if ('dirname' in e1) return 'dirname' in e2 ? (e1.dirname < e2.dirname ? -1 : 1) : -1;
    else return 'dirname' in e2 ? 1 : (e1.name < e2.name ? -1 : 1);
  });
};

const _removeEmptyDirEntries = async (parentDir, entries) => {
  await Promise.all(entries.map(async item => {
    if ('dirname' in item) {
      if (item.entries.length > 0) {
        _removeEmptyDirEntries(item, item.entries);
      }
      
      if (item.entries.length === 0) {
        const idx = parentDir.entries.indexOf(item);
        if (idx !== -1) parentDir.entries.splice(idx, 1);
      }
    }
  }));
};

const convertDirToEntries = async (projectId, dir, entries, userInfoId) => {
  await _convertDirToEntries(projectId, dir, entries, userInfoId);
  await Promise.all(entries.map(async item => {
    if ('dirname' in item) {
      await _removeEmptyDirEntries(item, item.entries);
    }
  }));
};

const analyzeSource = async projectId => {
  const pygount = () => new Promise((resolve, reject) => {
    const filterList = [/^__.+__$/];
    const sourceDir = getProjectSourceDir(projectId);
    
    exec(`pygount --format=summary ${sourceDir}`, (err, stdout, stderr) => {
      if (err) reject(err);
      else if (stderr) reject(stderr);
      else {
        let lines = stdout.split('\n');
        lines = lines.slice(2, lines.length - 3);
        const meta = lines.map(line => {
          const chunks = line.split(/\s+/).filter(i => !!i);
          const [files, codes, comments] = [chunks[chunks.length - 6], chunks[chunks.length - 4], chunks[chunks.length - 2]];
          const language = chunks.slice(0, chunks.length - 6).join(' ');
          return {
            language, files: +files, codes: +codes, comments: +comments
          };
        }).filter(m => !filterList.some(filter => filter.test(m.language)));
        resolve(meta);
      }
    });
  });
  const project = await Project.findById(projectId);
  project.metaUpdating = true;
  await project.save();
  
  pygount().then(meta => {
    project.meta = meta;
    project.metaUpdating = false;
    project.save();
  });
};

const removeProjectSourceFiles = async (projectId, fileIds) => {
  await Promise.all(fileIds.map(async id => {
    const file = await ProjectFile.findById(id);
    if (file) {
      const path = join(ROOT_DIR, file.path);
      if (existsSync(path)) await promises.unlink(path);
      await file.deleteOne();
    }
  }));
};

exports.getProjectDir = getProjectDir;
exports.getProjectSourceDir = getProjectSourceDir;
exports.removeProjectSourceTempDir = removeProjectSourceTempDir;
exports.cloneSourceFilesToTempDir = cloneSourceCodesToTempDir;
exports.moveSourceCodesFromTempDir = moveSourceCodesFromTempDir;
exports.convertDirToEntries = convertDirToEntries;
exports.analyzeSource = analyzeSource;
exports.removeFile = removeFile;
exports.removeSourceFiles = removeSourceFiles;
exports.getCommitInfo = getCommitInfo;
exports.removeProjectSourceFiles = removeProjectSourceFiles;
