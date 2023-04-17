const copy = require('recursive-copy');

const copySVG = async (projectPath) => {
  await copy('node_modules', `${projectPath}/node_modules`, {
    filter: ['**/*.svg'],
  });
};

const copyDoc = async (projectPath) => {
  await copy('./', `${projectPath}`, {
    filter: ['SECURITY.md', 'CHANGELOG.md'],
  });
};

/**
 * Copy svgs and documentation files to dist folder before pack vsix.
 */
const copyFiles = async (argumentsArray) => {
  let projectPath = '';
  if (argumentsArray.includes('designer')) {
    projectPath = 'dist/apps/vs-code-designer';
  } else {
    projectPath = 'dist/apps/vs-code-data-mapper';
  }

  try {
    await copySVG(projectPath);
    await copyDoc(projectPath);
  } catch (error) {
    console.error('Copy failed: ' + error);
  }
};

copyFiles(process.argv.slice(2));
