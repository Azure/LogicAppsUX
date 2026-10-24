#!/usr/bin/env node
/* global console, process */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const command = process.argv[2];
const forwardedArgs = process.argv.slice(3);
const isVscodeAdoPipeline = process.env.LA_VSCODE_ADO_PIPELINE === 'true';

function run(args, options = {}) {
  const invocation = resolvePnpmInvocation();
  execFileSync(invocation.executable, [...invocation.argsPrefix, ...args], {
    stdio: 'inherit',
    env: process.env,
    ...options,
  });
}

function resolvePnpmInvocation() {
  const npmExecPath = process.env.npm_execpath;
  if (npmExecPath && fs.existsSync(npmExecPath) && path.basename(npmExecPath).toLowerCase().includes('pnpm')) {
    return resolvePackageManagerInvocation(npmExecPath);
  }

  return { executable: 'pnpm', argsPrefix: [] };
}

function resolvePackageManagerInvocation(packageManagerPath, nodeExecutable = process.execPath) {
  const extension = path.extname(packageManagerPath).toLowerCase();
  if (extension === '.js' || extension === '.cjs' || extension === '.mjs') {
    return { executable: nodeExecutable, argsPrefix: [packageManagerPath] };
  }
  if (extension === '.cmd' || extension === '.bat') {
    const basePath = packageManagerPath.slice(0, -extension.length);
    const scriptPath = [`${basePath}.cjs`, `${basePath}.js`, `${basePath}.mjs`].find((candidate) => fs.existsSync(candidate));
    if (!scriptPath) {
      throw new Error(`Unable to find the JavaScript entrypoint for ${packageManagerPath}.`);
    }
    return { executable: nodeExecutable, argsPrefix: [scriptPath] };
  }

  return { executable: packageManagerPath, argsPrefix: [] };
}

switch (command) {
  case 'lint':
    run([
      '--dir',
      'apps/vs-code-designer',
      'exec',
      'eslint',
      'src/**/*.{ts,tsx}',
      '--report-unused-disable-directives',
      '--max-warnings',
      '0',
    ]);
    break;
  case 'build':
    if (isVscodeAdoPipeline) {
      fs.rmSync(path.join(process.cwd(), 'apps', 'vs-code-designer', 'out'), { recursive: true, force: true });
      run(['run', 'build:extension', ...forwardedArgs]);
      run(['--dir', 'apps/vs-code-designer', 'run', 'test:e2e-cli:compile']);
    } else {
      run(['exec', 'turbo', 'run', 'build', ...forwardedArgs]);
    }
    break;
  case 'package':
    run(['run', 'vscode:designer:pack', ...forwardedArgs]);
    if (isVscodeAdoPipeline) {
      execFileSync(process.execPath, ['scripts/stage-vscode-e2e-build-artifact.js'], { stdio: 'inherit', env: process.env });
    }
    break;
  case 'test':
    run(['--dir', 'apps/vs-code-designer', 'run', 'test:e2e-cli:unit']);
    run(['run', 'test:extension-unit', ...forwardedArgs]);
    break;
  default:
    console.error(`Expected one of: lint, build, package, test. Received: ${command || '<missing>'}`);
    process.exit(1);
}
