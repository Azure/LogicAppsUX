module.exports = (config) => {
  return {
    ...config,
    externals: [...config.externals, { vscode: 'commonjs vscode' }],
  };
};
