/* eslint-disable no-undef */
const copy = require('recursive-copy');
const path = require('path');
const fs = require('fs/promises');

const copyEmbeddedMapper = async (projectPath) => {
  const mapperPath = path.resolve(__dirname, '..', '..', 'libs', 'data-mapper-v3');
  const runtimePath = 'tools/compiler-worker/runtime/win-x64';
  const requiredFiles = [
    'out/embedded.js',
    'out/compilerHost.js',
    'out/webview/webview.js',
    'out/webview/lml.js',
    'out/webview/lml.css',
    'media/icons/mapper.svg',
    `${runtimePath}/BizTalk.DataMapper.Worker.exe`,
    `${runtimePath}/BizTalk.DataMapper.Worker.dll`,
    `${runtimePath}/BizTalk.DataMapper.Worker.deps.json`,
    `${runtimePath}/BizTalk.DataMapper.Worker.runtimeconfig.json`,
    `${runtimePath}/BizTalk.DataMapper.Core.dll`,
    `${runtimePath}/coreclr.dll`,
    `${runtimePath}/hostfxr.dll`,
    `${runtimePath}/hostpolicy.dll`,
    `${runtimePath}/framework-transform/BizTalk.DataMapper.FrameworkTransform.exe`,
    `${runtimePath}/framework-transform/BizTalk.DataMapper.FrameworkTransform.exe.config`,
    `${runtimePath}/framework-transform/saxon9he.dll`,
    `${runtimePath}/framework-transform/saxon9he-api.dll`,
    `${runtimePath}/framework-transform/IKVM.Runtime.dll`,
  ];

  for (const relativePath of requiredFiles) {
    const sourcePath = path.join(mapperPath, relativePath);
    const stats = await fs.stat(sourcePath).catch(() => undefined);
    if (!stats?.isFile() || stats.size === 0) {
      throw new Error(
        `Missing required embedded mapper asset: ${sourcePath}. Run pnpm --dir libs/data-mapper-v3 run build:embedded from the repository root.`
      );
    }
  }

  await copy(mapperPath, path.join(projectPath, 'assets', 'data-mapper-v3'), {
    filter: ['out/compilerHost.js', 'out/webview/**', 'media/**', `${runtimePath}/**`, '!**/*.pdb', '!**/*.map'],
    overwrite: true,
  });
};

const copyDoc = async (projectPath) => {
  await copy('./src', `${projectPath}`, {
    filter: ['LICENSE.md', 'package.json', 'README.md', 'assets/**'],
    overwrite: true,
  });
  await copy(path.resolve(__dirname, '..', '..', 'CHANGELOG.md'), path.join(projectPath, 'CHANGELOG.md'), {
    overwrite: true,
  });
};

/**
 * Copy svgs and documentation files to dist folder before pack vsix.
 */
const copyFiles = async () => {
  const projectPath = path.join(__dirname, 'dist');

  try {
    await copyDoc(projectPath);
    await copyEmbeddedMapper(projectPath);
  } catch (error) {
    console.error('Copy failed: ' + error);
    process.exitCode = 1;
  }
};

copyFiles();
