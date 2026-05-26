import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, rmSync, copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const vitestPath = fileURLToPath(new URL('../../../node_modules/vitest/vitest.mjs', import.meta.url));
const args = process.argv.slice(2);
const coverageEnabled = process.env.VITEST_COVERAGE !== 'false';
const coverageDir = join(process.cwd(), 'coverage');
const shardCoverageDir = join(process.cwd(), '.vitest-coverage-shards');

const isTestFile = (file) => /(^|[/\\])src[/\\].*\.test\.tsx?$/.test(file);
const isExcludedTestHarness = (file) => file.startsWith('src/test/');
const fileArgs = args.filter(isTestFile).map((file) => file.replace(/\\/g, '/'));
const baseArgs = args.filter((arg) => !isTestFile(arg));

const findTestFiles = (directory) => {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = join(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...findTestFiles(entryPath));
    } else if (/\.test\.tsx?$/.test(entry.name)) {
      const testFile = relative(process.cwd(), entryPath).replace(/\\/g, '/');
      if (!isExcludedTestHarness(testFile)) {
        files.push(testFile);
      }
    }
  }

  return files;
};

const runVitest = (testFile) =>
  new Promise((resolve) => {
    const child = spawn(process.execPath, [vitestPath, 'run', ...baseArgs, testFile], {
      env: process.env,
      stdio: 'inherit',
    });

    child.on('exit', (code, signal) => {
      resolve({ code: code ?? 1, signal });
    });
  });

const saveCoverage = (index) => {
  const lcovPath = join(coverageDir, 'lcov.info');
  if (existsSync(lcovPath)) {
    mkdirSync(shardCoverageDir, { recursive: true });
    copyFileSync(lcovPath, join(shardCoverageDir, `lcov-${String(index).padStart(4, '0')}.info`));
  }
};

const mergeCoverage = () => {
  if (!existsSync(shardCoverageDir)) {
    return;
  }

  const lcovFiles = readdirSync(shardCoverageDir)
    .filter((file) => file.endsWith('.info'))
    .sort();

  if (lcovFiles.length === 0) {
    return;
  }

  mkdirSync(coverageDir, { recursive: true });
  const merged = lcovFiles
    .map((file) => readFileSync(join(shardCoverageDir, file), 'utf8').trim())
    .filter(Boolean)
    .join('\n');
  writeFileSync(join(coverageDir, 'lcov.info'), `${merged}\n`);
};

const run = async () => {
  const testFiles = (fileArgs.length ? fileArgs : findTestFiles(join(process.cwd(), 'src')).sort()).filter(
    (file) => !isExcludedTestHarness(file)
  );

  if (coverageEnabled) {
    rmSync(shardCoverageDir, { recursive: true, force: true });
  }

  for (const [index, testFile] of testFiles.entries()) {
    console.log(`Running VS Code designer unit test ${index + 1}/${testFiles.length}: ${testFile}`);
    if (coverageEnabled) {
      rmSync(coverageDir, { recursive: true, force: true });
    }

    const result = await runVitest(testFile);

    if (result.signal) {
      process.kill(process.pid, result.signal);
      return;
    }

    if (result.code !== 0) {
      process.exit(result.code);
    }

    if (coverageEnabled) {
      saveCoverage(index);
    }
  }

  if (coverageEnabled) {
    mergeCoverage();
  }
};

run();
