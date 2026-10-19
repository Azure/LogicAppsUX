import { execSync } from 'node:child_process';
import { existsSync, readdirSync, statSync, utimesSync } from 'node:fs';
import path from 'node:path';

const root = path.resolve(__dirname, '..');
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
  const newestSource = Math.max(newestMtime(path.join(root, 'src')), newestMtime(path.join(root, 'webview/src')));
  if (existsSync(bundle) && statSync(bundle).mtimeMs >= newestSource) {
    return;
  }
  execSync('pnpm run bundle:webview:dev', { cwd: root, stdio: 'inherit' });
  // Webpack skips rewriting an unchanged bundle, which would leave it looking stale forever.
  const now = new Date();
  utimesSync(bundle, now, now);
}
