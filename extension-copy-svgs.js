const copy = require('recursive-copy');

const copySVG = async () => {
  await copy('node_modules', 'dist/apps/vs-code-designer/node_modules', {
    filter: ['**/*.svg'],
  });
};

const copyDoc = async () => {
  await copy('./', 'dist/apps/vs-code-designer', {
    filter: ['SECURITY.md', 'CHANGELOG.md'],
  });
};

/**
 * Copy svgs and documentation files to dist folder before pack vsix.
 */
const copyFiles = async () => {
  try {
    await copySVG();
    await copyDoc();
  } catch (error) {
    console.error('Copy failed: ' + error);
  }
};

copyFiles();
