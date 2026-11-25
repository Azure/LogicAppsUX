import * as fs from 'fs';
import * as path from 'path';

/**
 * Resolve the stable ExTester cache we own, without inspecting ExTester.code.
 * Downloading and test execution remain on ExTester's public API.
 */
export function resolveCachedExTesterRuntime(
  storageFolder: string,
  platform: NodeJS.Platform = process.platform,
  arch: string = process.arch
): { codeFolder: string; executablePath: string; cliPath: string; cliBase: string } {
  if (platform !== 'win32' && platform !== 'linux' && platform !== 'darwin') {
    throw new Error(`Unsupported ExTester platform: ${platform}`);
  }
  if (platform === 'win32' && arch !== 'x64' && arch !== 'arm64') {
    throw new Error(`Unsupported ExTester Windows architecture: ${arch}`);
  }
  const codeFolder = path.resolve(
    storageFolder,
    platform === 'darwin' ? 'Visual Studio Code.app' : `VSCode-${platform}-${arch}${platform === 'win32' ? '-archive' : ''}`
  );
  const executablePath = path.join(
    codeFolder,
    ...(platform === 'darwin' ? ['Contents', 'MacOS', 'Electron'] : [platform === 'win32' ? 'Code.exe' : 'code'])
  );
  let cliPath = path.join(codeFolder, ...(platform === 'darwin' ? ['Contents', 'Resources'] : ['resources']), 'app', 'out', 'cli.js');
  if (!fs.existsSync(executablePath)) {
    throw new Error(`VS Code executable not found at ${executablePath}. Clear ${codeFolder} and rerun the E2E launcher.`);
  }
  if (platform === 'win32' && !fs.existsSync(cliPath)) {
    const candidates = fs
      .readdirSync(codeFolder, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => path.join(codeFolder, entry.name, 'resources', 'app', 'out', 'cli.js'))
      .filter((candidate) => fs.existsSync(candidate));
    if (candidates.length !== 1) {
      throw new Error(`VS Code CLI cache is missing or ambiguous at ${codeFolder}: ${candidates.length} nested candidates.`);
    }
    cliPath = candidates[0];
  }
  if (!fs.existsSync(cliPath)) {
    throw new Error(`VS Code CLI not found at ${cliPath}. Clear ${codeFolder} and rerun the E2E launcher.`);
  }
  // The runner pins a modern VS Code (>=1.86); no legacy CLI flag is needed.
  const cliEnvironment = platform === 'win32' ? 'set "ELECTRON_RUN_AS_NODE=1" &&' : 'ELECTRON_RUN_AS_NODE=1';
  return { codeFolder, executablePath, cliPath, cliBase: `${cliEnvironment} "${executablePath}" "${cliPath}"` };
}

export function getExTesterCliEnvironment(env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  return Object.fromEntries(Object.entries(env).filter(([key]) => !key.startsWith('NODE_')));
}
