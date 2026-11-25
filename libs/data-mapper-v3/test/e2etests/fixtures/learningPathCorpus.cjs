const fs = require('node:fs');
const path = require('node:path');

const learningPathDirectory = path.resolve(__dirname, '..');
const packageRoot = path.resolve(__dirname, '../../..');
const infrastructureDirectories = new Set(['fixtures', 'pages', 'samples']);

// Keep the original Windows corpus IDs on every host.
function compareLearningPathPaths(left, right) {
  const first = left.replace(/\//g, '\\');
  const second = right.replace(/\//g, '\\');
  return first < second ? -1 : first > second ? 1 : 0;
}

function getLearningPathMaps(directory = learningPathDirectory) {
  const visit = (currentDirectory) =>
    fs.readdirSync(currentDirectory, { withFileTypes: true }).flatMap((entry) => {
      if (currentDirectory === directory && infrastructureDirectories.has(entry.name)) {
        return [];
      }
      const fullPath = path.join(currentDirectory, entry.name);
      return entry.isDirectory() ? visit(fullPath) : entry.name.endsWith('.btm') ? [path.relative(directory, fullPath)] : [];
    });
  return visit(directory).sort(compareLearningPathPaths);
}

exports.packageRoot = packageRoot;
exports.learningPathDirectory = learningPathDirectory;
exports.samplesDirectory = path.join(learningPathDirectory, 'samples');
exports.compareLearningPathPaths = compareLearningPathPaths;
exports.getLearningPathMaps = getLearningPathMaps;
