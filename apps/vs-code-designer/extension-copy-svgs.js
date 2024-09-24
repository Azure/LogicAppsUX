/* eslint-disable no-undef */
const copy = require('recursive-copy');
const path = require('path');

const copyDoc = async (projectPath) => {
  await copy('./src', `${projectPath}`, {
    filter: ['LICENSE.md', 'package.json', 'README.md', 'assets/**'],
  });
  await copy(path.resolve(__dirname, '..', '..'), `${projectPath}`, {
    filter: ['CHANGELOG.md'],
  });
};

/**
 * Copy svgs and documentation files to dist folder before pack vsix.
 */
const copyFiles = async () => {
  const projectPath = 'dist/';

  try {
    await copyDoc(projectPath);
  } catch (error) {
    console.error('Copy failed: ' + error);
  }
};

copyFiles();
