/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
/* global __dirname, require, structuredClone */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const { parse } = require('yaml');

const repositoryRoot = path.resolve(__dirname, '..', '..', '..');
const consumer = parse(fs.readFileSync(path.join(repositoryRoot, '.config', 'templates', 'vscode-e2e-cli-run-suite.yml'), 'utf8'));
const pipeline = parse(fs.readFileSync(path.join(repositoryRoot, '.config', 'vscode-e2e-cli.1es.yml'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
const branchName = "${{ if eq(parameters.suiteId, 'unitTests') }}";
const displayName = 'Run registered E2E contracts on consumer OS';
const command = 'pnpm --dir apps/vs-code-designer run test:e2e-cli:unit';

function collect(value, predicate, result = []) {
  if (value && typeof value === 'object') {
    if (!Array.isArray(value) && predicate(value)) {
      result.push(value);
    }
    for (const child of Object.values(value)) {
      collect(child, predicate, result);
    }
  }
  return result;
}

function assertMandatoryConsumerContract(template, entry, packageManifest) {
  const jobs = template.jobs;
  assert.ok(Array.isArray(jobs) && jobs.length === 1);
  const steps = jobs[0].steps;
  const clauses = steps.filter((step) => Object.hasOwn(step, branchName));
  assert.equal(clauses.length, 1, 'Exactly one unitTests-only contract clause is required');
  assert.equal(Object.keys(clauses[0]).length, 1, 'No additional condition may weaken the contract clause');
  const branch = clauses[0][branchName];
  assert.ok(Array.isArray(branch) && branch.length === 1);
  const step = branch[0];
  assert.deepEqual(Object.keys(step).sort(), ['pwsh', 'displayName', 'workingDirectory'].sort());
  assert.equal(step.displayName, displayName);
  assert.equal(step.workingDirectory, '$(Build.SourcesDirectory)');
  assert.equal(step.pwsh.split(command).length - 1, 1, 'Exact registered package alias must run once');
  assert.match(step.pwsh, /test:e2e-cli:unit \*>&1 \| Tee-Object -FilePath \$contractLog/);
  assert.match(step.pwsh, /\$contractExitCode = \$LASTEXITCODE\s+if \(\$contractExitCode -ne 0\) \{\s+exit \$contractExitCode\s+\}/);
  assert.match(step.pwsh, /Join-Path '\$\(Build\.ArtifactStagingDirectory\)' 'vscode-e2e-cli\/\$\{\{ parameters\.artifactName \}\}'/);
  assert.match(step.pwsh, /Join-Path \$diagnosticsRoot 'registered-contract-chain\.log'/);
  const clauseIndex = steps.indexOf(clauses[0]);
  const extractionIndex = steps.findIndex((item) => item.displayName === 'Extract verified E2E artifact');
  assert.ok(extractionIndex >= 0 && extractionIndex < clauseIndex, 'Contracts must consume the admitted compiled artifact');
  const prior = steps.slice(0, extractionIndex);
  assert.ok(prior.some((item) => item.displayName === 'Verify current-run E2E artifact admission'));
  assert.ok(prior.some((item) => item.displayName === 'Verify exact admitted source checkout'));
  const before = collect(steps.slice(0, clauseIndex), (item) => item.displayName === 'Prepare VS Code extension dependencies once');
  assert.equal(before.length, 0, 'Contracts must precede native dependency preparation');
  const after = collect(steps.slice(clauseIndex + 1), (item) => item.displayName === 'Prepare VS Code extension dependencies once');
  assert.equal(after.length, 2, 'Both OS native preparation routes remain after the contract gate');
  const unitJobs = collect(entry, (item) => item.template === '/.config/templates/vscode-e2e-cli-run-suite.yml@self').filter(
    (item) => item.parameters.suiteId === 'unitTests'
  );
  assert.equal(unitJobs.length, 2, 'Both existing unit consumers must use this gate');
  assert.deepEqual(unitJobs.map((item) => item.parameters.platform).sort(), ['linux', 'windows']);
  for (const { parameters } of unitJobs) {
    assert.equal(parameters.jobName, `${parameters.platform}_unit_tests`);
    assert.equal(parameters.cliArguments, '--label unitTests');
    assert.match(parameters.selected, new RegExp(`${parameters.platform}_unitTests`));
    assert.ok(parameters.dependsOn.includes('build_current_run_e2e_artifact'));
  }
  assert.ok(packageManifest.scripts['test:e2e-cli:unit'].startsWith('node --test scripts/ado-consumer-contract.unit.test.js && '));
  assert.ok(packageManifest.scripts['test:e2e-cli:build'].endsWith('pnpm run test:e2e-cli:unit'));
}

test('same registered contracts gate both existing OS consumers after admission/extraction, before native prep, without changing native labels', () => {
  assertMandatoryConsumerContract(consumer, pipeline, manifest);
});

const controls = [
  [
    'missing-contract-clause',
    (template) => {
      template.jobs[0].steps = template.jobs[0].steps.filter((step) => !Object.hasOwn(step, branchName));
    },
  ],
  [
    'wrong-suite-selector',
    (template) => {
      const branch = template.jobs[0].steps.find((step) => Object.hasOwn(step, branchName));
      branch["${{ if eq(parameters.suiteId, 'other') }}"] = branch[branchName];
      delete branch[branchName];
    },
  ],
  [
    'before-artifact-admission',
    (template) => {
      const steps = template.jobs[0].steps;
      const index = steps.findIndex((step) => Object.hasOwn(step, branchName));
      steps.unshift(...steps.splice(index, 1));
    },
  ],
  [
    'continue-on-error',
    (template, _entry, _manifest, step) => {
      step.continueOnError = true;
    },
  ],
  [
    'always-condition',
    (template, _entry, _manifest, step) => {
      step.condition = 'always()';
    },
  ],
  [
    'missing-exit-propagation',
    (template, _entry, _manifest, step) => {
      step.pwsh = step.pwsh.replace('exit $contractExitCode', 'exit 0');
    },
  ],
  [
    'missing-output-retention',
    (template, _entry, _manifest, step) => {
      step.pwsh = step.pwsh.replace(' | Tee-Object -FilePath $contractLog', '');
    },
  ],
  [
    'different-registered-command',
    (template, _entry, _manifest, step) => {
      step.pwsh = step.pwsh.replace(command, 'node scripts/private-unregistered-controls.js');
    },
  ],
  [
    'missing-Windows-unit-consumer',
    (_template, entry) => {
      collect(entry, (item) => item.parameters?.jobName === 'windows_unit_tests')[0].parameters.suiteId = 'other';
    },
  ],
  [
    'unregistered-public-regression',
    (_template, _entry, packageManifest) => {
      packageManifest.scripts['test:e2e-cli:unit'] = packageManifest.scripts['test:e2e-cli:unit'].replace(
        'node --test scripts/ado-consumer-contract.unit.test.js && ',
        ''
      );
    },
  ],
];
for (const [name, mutate] of controls) {
  test(`mandatory consumer contract rejects ${name}`, () => {
    const template = structuredClone(consumer);
    const entry = structuredClone(pipeline);
    const packageManifest = structuredClone(manifest);
    const step = template.jobs[0].steps.find((item) => Object.hasOwn(item, branchName))[branchName][0];
    mutate(template, entry, packageManifest, step);
    assert.throws(() => assertMandatoryConsumerContract(template, entry, packageManifest));
  });
}
