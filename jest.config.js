const { getJestProjects } = require('@nrwl/jest');

module.exports = {
  projects: getJestProjects(),
  transformIgnorePatterns: ["node_modules\/(?!(monaco-editor|monaco-editor-core)\/)"],
};
