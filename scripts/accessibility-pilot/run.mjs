import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReport, renderSummary, summarizePlaywright } from './report.mjs';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../../', import.meta.url));
const artifactRoot = join(root, 'accessibility-pilot', 'artifacts', 'attempts');

const writeReport = async (attempt, report) => {
  await writeFile(join(attempt, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(join(attempt, 'summary.md'), renderSummary(report));
};

const run = async () => {
  if (process.argv.slice(2).some((arg) => arg !== '--')) {
    throw new Error('The accessibility pilot does not take Playwright arguments.');
  }
  const inventory = JSON.parse(await readFile(join(root, 'accessibility-pilot', 'journey-inventory.json'), 'utf8'));
  await mkdir(artifactRoot, { recursive: true });
  const attempt = await mkdtemp(join(artifactRoot, 'attempt-'));
  const reportPath = join(attempt, 'playwright-report.json');

  // Write the initial state before loading Playwright so startup failures cannot leave a success-shaped report.
  await writeReport(attempt, createReport(inventory, { status: 'in_progress' }));
  console.log(`Accessibility pilot artifacts: ${relative(root, attempt)}`);

  let synthetic;
  try {
    const result = spawnSync(
      process.execPath,
      [require.resolve('@playwright/test/cli'), 'test', '--config=playwright.accessibility-pilot.config.ts'],
      {
        cwd: root,
        stdio: 'inherit',
        env: {
          ...process.env,
          LAUX_ACCESSIBILITY_PLAYWRIGHT_JSON: reportPath,
          LAUX_ACCESSIBILITY_OUTPUT_DIR: join(attempt, 'test-results'),
        },
      }
    );
    synthetic = summarizePlaywright(result, null);
    const rawReport = JSON.parse(await readFile(reportPath, 'utf8'));
    synthetic = summarizePlaywright(result, rawReport);
  } catch (error) {
    synthetic = { ...synthetic, status: 'failed', errors: [...(synthetic?.errors ?? []), error.message] };
  }

  await writeReport(attempt, createReport(inventory, synthetic));
  if (synthetic.status !== 'passed') {
    console.error(`Accessibility pilot self-tests ${synthetic.status}; see ${relative(root, join(attempt, 'report.json'))}.`);
    process.exitCode = synthetic.exitCode || 1;
  }
};

run().catch((error) => {
  console.error('Accessibility pilot could not write its report:', error.message);
  process.exitCode = 1;
});
