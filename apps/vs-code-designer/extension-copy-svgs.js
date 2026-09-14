/* eslint-disable no-undef */
const copy = require('recursive-copy');
const path = require('path');

const copyDoc = async (projectPath) => {
  await copy('./src', `${projectPath}`, {
    dot: true,
    filter: ['.vscodeignore', 'LICENSE.md', 'package.json', 'README.md', 'assets/**'],
    overwrite: true,
  });
  await copy(path.resolve(__dirname, '..', '..'), `${projectPath}`, {
    filter: ['CHANGELOG.md'],
    overwrite: true,
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
