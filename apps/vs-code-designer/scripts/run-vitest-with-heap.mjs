import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const vitestPath = fileURLToPath(new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url));
const nodeOptions = [process.env.NODE_OPTIONS, '--max-old-space-size=8192'].filter(Boolean).join(' ');

const child = spawn(process.execPath, [vitestPath, ...process.argv.slice(2)], {
  env: { ...process.env, NODE_OPTIONS: nodeOptions },
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
