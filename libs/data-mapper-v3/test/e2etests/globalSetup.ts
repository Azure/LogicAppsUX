import { execSync } from 'node:child_process';
import { existsSync, readdirSync, rmSync, statSync, utimesSync } from 'node:fs';
import path from 'node:path';
import { coverageDirectory, coverageEnabled } from './coverage';
import { learningPathDirectory, packageRoot as root } from './fixtures/learningPathCorpus.cjs';

const bundle = path.join(root, 'out/webview/webview.js');

function newestMtime(dir: string): number {
  let newest = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(full) : statSync(full).mtimeMs);
  }
  return newest;
}

// Lets tests run from the VS Code Playwright extension, which doesn't run the package.json scripts.
export default function globalSetup() {
  if (process.platform === 'win32') {
    const { buildLearningPathHelpers } = require('../native/buildLearningPathHelpers.cjs');
    buildLearningPathHelpers(learningPathDirectory);
  }
  if (coverageEnabled) {
    rmSync(coverageDirectory, { recursive: true, force: true });
  }
  const newestSource = Math.max(newestMtime(path.join(root, 'src')), newestMtime(path.join(root, 'webview/src')));
  if (!coverageEnabled && existsSync(bundle) && statSync(bundle).mtimeMs >= newestSource) {
    return;
  }
  execSync('pnpm run bundle:webview:dev', { cwd: root, stdio: 'inherit' });
  // Webpack skips rewriting an unchanged bundle, which would leave it looking stale forever.
  const now = new Date();
  utimesSync(bundle, now, now);
}
