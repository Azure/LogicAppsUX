import { spawn } from 'node:child_process';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const vitestPath = fileURLToPath(new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url));
const nodeOptions = [process.env.NODE_OPTIONS, '--max-old-space-size=8192'].filter(Boolean).join(' ');
const args = process.argv.slice(2);

const hasFileFilters = args.some((arg) => /(^|[/\\])src[/\\].*\.test\.tsx?$/.test(arg));
const shouldShard = process.env.VITEST_COVERAGE === 'false' && !hasFileFilters;
const shardSize = Number(process.env.VSCODE_DESIGNER_TEST_SHARD_SIZE ?? 1);

const runVitest = (vitestArgs) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [vitestPath, ...vitestArgs], {
      env: { ...process.env, NODE_OPTIONS: nodeOptions },
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });

const findTestFiles = (directory) => {
  const files = [];

  for (const entry of readdirSync(directory)) {
    const entryPath = join(directory, entry);
    const stats = statSync(entryPath);

    if (stats.isDirectory()) {
      files.push(...findTestFiles(entryPath));
    } else if (/\.test\.tsx?$/.test(entry)) {
      const testFile = relative(process.cwd(), entryPath).replace(/\\/g, '/');

      if (!testFile.startsWith('src/test/')) {
        files.push(testFile);
      }
    }
  }

  return files;
};

const run = async () => {
  if (!shouldShard) {
    const result = await runVitest(args);

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    process.exit(result.code);
  }

  const [command = 'run', ...baseArgs] = args;
  const testFiles = findTestFiles(join(process.cwd(), 'src')).sort();

  for (let index = 0; index < testFiles.length; index += shardSize) {
    const shard = testFiles.slice(index, index + shardSize);
    console.log(`Running VS Code designer unit test shard ${Math.floor(index / shardSize) + 1}/${Math.ceil(testFiles.length / shardSize)}`);

    const result = await runVitest([command, ...baseArgs, ...shard]);

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    if (result.code !== 0) {
      process.exit(result.code);
    }
  }
};

run();
