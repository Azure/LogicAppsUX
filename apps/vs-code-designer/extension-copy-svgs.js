const copy = require('recursive-copy');

const copyDoc = async (projectPath) => {
  await copy('./src', `${projectPath}`, {
    filter: ['LICENSE.md', 'CHANGELOG.md', 'package.json', 'README.md', 'assets/**'],
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
