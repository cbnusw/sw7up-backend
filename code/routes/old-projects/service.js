const axios = require('axios');
const { exec } = require('child_process');
const { promises, existsSync } = require('fs');
const clone = require('git-clone/promise');
const mime = require('mime');
const { join } = require('path');
const { ROOT_DIR } = require('../../../shared/env');
const { GithubAccount, UserInfo, ProjectFile } = require('../../../shared/models');
const { SEMESTERS } = require('../../../shared/constants');

const USER_AGENT = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36';

const getCommitInfo = async (accessToken, repo) => {
  let usernames = [];
  let length = -1;
  let page = 1;
  while (usernames.length !== length) {
    length = usernames.length;
    const response = await axios.get(
      `https://api.github.com/repos/${repo.full_name}/commits`,
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
      ...data.map(d => d.author?.login || d.commit?.author?.name).filter(username => !!username)
    ];
    page++;
  }
  
  const commitObject = usernames.reduce((acc, username) => {
    acc[username] = (acc[username] || 0) + 1;
    return acc;
  }, {});
  
  return await Promise.all(
    Object.keys(commitObject).map(async username => {
      let account = await GithubAccount.findOne({ username })
        .populate({ path: 'user', model: UserInfo })
        .select('-accessToken');
      if (!account) account = await GithubAccount.create({ username });
      return { committer: account, numOfCommits: commitObject[username] };
    })
  );
};

const _clone = async (projectId, url, userId) => {
  
  async function traceFiles (path, entryList) {
    const basenames = await promises.readdir(path);
    for (let name of basenames) {
      const p = `${path}/${name}`;
      const s = await promises.stat(p);
      if (s.isDirectory()) {
        const entries = [];
        entryList.push({ dirname: name, entries });
        await traceFiles(p, entries);
      } else {
        const path = p.replace(`${ROOT_DIR}/`, '');
        const exFile = await ProjectFile.findOne({ path });
        if (exFile) await exFile.deleteOne();
        const file = await ProjectFile.create({
          path,
          name,
          size: s.size,
          type: mime.getType(p),
          creator: userId,
        });
        entryList.push(file);
      }
    }
    entryList.sort((e1, e2) => {
      if ('dirname' in e1) return 'dirname' in e2 ? (e1.dirname < e2.dirname ? -1 : 1) : -1;
      else return 'dirname' in e2 ? 1 : (e1.name < e2.name ? -1 : 1);
    });
  }
  
  const chunks = url.split('/');
  const projectName = chunks[chunks.length - 1].replace(/\.git$/, '');
  const tempDir = join(ROOT_DIR, 'code-uploads/code/static/projects', projectId, 'temp-sources');
  const cloneDir = join(tempDir, projectName);
  const entries = [];
  
  if (existsSync(tempDir)) await promises.rm(tempDir, { recursive: true, force: true });
  
  await clone(url, cloneDir);
  await traceFiles(tempDir, entries);
  
  return entries;
};

const analyzeSource = (sourcePath) => {
  const filterList = [/^__.+__$/];
  return new Promise((resolve, reject) => {
    exec(`pygount --format=summary ${sourcePath}`, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      } else if (stderr) {
        reject(stderr);
      } else {
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
};

const getFileIdFromPublicProject = project => {
  function convert (entries, files) {
    (entries || []).forEach(e => 'dirname' in e ? convert(e.entries, files) : files.push(e._id || e));
  }
  
  const sourceFiles = [];
  convert(project.source, sourceFiles);
  
  return [
    ...project.banners
      .filter(banner => banner.file)
      .map(banner => banner.file._id || banner.file),
    ...sourceFiles,
    ...project.documents
      .filter(document => document.file)
      .map(document => document.file._id || document.file)
  ];
};

const moveTemporarySources = async (body) => {
  
  function flatTracedEntries (entries, files) {
    entries.forEach(entry => {
      if ('dirname' in entry) {
        flatTracedEntries(entry.entries, files);
      } else {
        files.push(entry);
      }
    });
  }
  
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
};

const compareGradeAndSemester = (o1, o2) => {
  if (o1.grade === o2.grade) {
    const i1 = SEMESTERS.indexOf(o1.semester);
    const i2 = SEMESTERS.indexOf(o2.semester);
    return i1 - i2;
  }
  return o1.grade - o2.grade;
};

exports.getCommitInfo = getCommitInfo;
exports.clone = _clone;
exports.analyzeSource = analyzeSource;
exports.getFileIdFromPublicProject = getFileIdFromPublicProject;
exports.moveTemporarySources = moveTemporarySources;
exports.compareGradeAndSemester = compareGradeAndSemester;
