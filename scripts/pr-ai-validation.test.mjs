import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const workflow = readFileSync(new URL('../.github/workflows/pr-ai-validation.yml', import.meta.url), 'utf8');
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;

function stepScript(name) {
  const block = workflow.split(`      - name: ${name}\n`)[1]?.split('\n      - name: ')[0];
  assert.ok(block, `Missing workflow step: ${name}`);
  const script = block.split('          script: |\n')[1];
  assert.ok(script, `Missing inline script: ${name}`);
  return script
    .split('\n')
    .map((line) => line.slice(12))
    .join('\n');
}

const gather = new AsyncFunction('github', 'context', 'core', 'require', 'console', 'process', stepScript('Gather PR data'));
const post = new AsyncFunction('github', 'context', 'core', 'require', 'console', 'process', stepScript('Post result and manage labels'));
const pr = {
  number: 9677,
  title: 'feat: shared node rendering',
  body: 'Actual description',
  labels: [{ name: 'risk:medium' }],
  head: { ref: 'feature/shared-node' },
  user: { login: 'contributor' },
};
const request = { owner: 'Azure', repo: 'LogicAppsUX', pull_number: pr.number };

function oversizedDiffError(status = 406, errors = [{ resource: 'PullRequest', field: 'diff', code: 'too_large' }]) {
  return Object.assign(new Error('Diff retrieval failed'), { status, response: { data: { errors } } });
}

function file(filename, patch = '+change') {
  return { filename, status: 'modified', additions: 1, deletions: 0, patch };
}

function fixture({ error, diff = '+normal', pages = [], pageError, manual = false, number = '9677' } = {}) {
  const state = { writes: new Map(), requests: [], pagesFetched: 0, warnings: [], failures: [], logs: [] };
  const listFiles = () => assert.fail('Use the native pagination iterator');
  const github = {
    rest: {
      pulls: {
        listFiles,
        get: async (options) => {
          state.requests.push(options);
          if (!options.mediaType) {
            return { data: pr };
          }
          if (error) {
            throw error;
          }
          return { data: diff };
        },
      },
    },
    paginate: {
      iterator: async function* (method, options) {
        assert.equal(method, listFiles);
        assert.deepEqual(options, { ...request, per_page: 100 });
        for (const data of pages) {
          state.pagesFetched++;
          yield { data };
        }
        if (pageError) {
          throw pageError;
        }
      },
    },
  };
  const context = { repo: { owner: request.owner, repo: request.repo }, payload: manual ? {} : { pull_request: pr } };
  const core = { warning: (message) => state.warnings.push(message), setFailed: (message) => state.failures.push(message) };
  const require = (name) => {
    assert.equal(name, 'fs');
    return {
      writeFileSync: (path, data) => {
        assert.ok(['/tmp/pr-meta.json', '/tmp/pr-diff.txt'].includes(path), `Unexpected write: ${path}`);
        state.writes.set(path, data);
      },
      readFileSync: (path) => {
        assert.equal(path, '/tmp/validation-result.json');
        throw new Error('No AI verdict was produced');
      },
    };
  };
  const console = { log: (message) => state.logs.push(message) };
  const process = { env: { PR_NUMBER: number } };
  return {
    state,
    run: () => gather(github, context, core, require, console, process),
    post: () => post(github, context, core, require, console, process),
  };
}

test('preserves normal raw-diff sampling and metadata without listing files', async () => {
  const input = Array.from({ length: 4005 }, (_, i) => `+line ${i}`).join('\n');
  const { run, state } = fixture({ diff: input });
  await run();
  assert.equal(state.writes.get('/tmp/pr-diff.txt'), input.split('\n').slice(0, 4000).join('\n'));
  assert.deepEqual(JSON.parse(state.writes.get('/tmp/pr-meta.json')), {
    number: pr.number,
    title: pr.title,
    body: pr.body,
    labels: ['risk:medium'],
    head_ref: pr.head.ref,
    author: pr.user.login,
  });
  assert.deepEqual(state.requests, [{ ...request, mediaType: { format: 'diff' } }]);
  assert.equal(state.pagesFetched, 0);
  assert.deepEqual(state.warnings, []);
});

test('retains workflow_dispatch metadata retrieval before the diff request', async () => {
  const { run, state } = fixture({ manual: true });
  await run();
  assert.deepEqual(state.requests, [request, { ...request, mediaType: { format: 'diff' } }]);
});

test('retains the explicit failure when workflow_dispatch has no PR number', async () => {
  const { run, state } = fixture({ manual: true, number: '' });
  await run();
  assert.deepEqual(state.failures, ['No pull_request context and no pr_number input provided.']);
  assert.equal(state.requests.length, 0);
  assert.equal(state.writes.size, 0);
});

test('samples native listFiles pages after only the structured oversized-diff error', async () => {
  const { run, state } = fixture({
    error: oversizedDiffError(),
    pages: [Array.from({ length: 100 }, (_, i) => file(`first-${i}.ts`)), [file('second.ts', '@@ hunk @@\n+actual')]],
  });
  await run();
  assert.equal(state.pagesFetched, 2);
  const sample = state.writes.get('/tmp/pr-diff.txt');
  assert.ok(sample.startsWith('diff --git a/first-0.ts b/first-0.ts\n+change'));
  assert.ok(sample.endsWith('diff --git a/second.ts b/second.ts\n@@ hunk @@\n+actual'));
  assert.equal(state.warnings.length, 1);
});

test('stops pagination at the 4000-line sample bound without fetching the next page', async () => {
  const { run, state } = fixture({
    error: oversizedDiffError(),
    pages: [[file('huge.ts', '+line\n'.repeat(5000))], [file('must-not-fetch.ts')]],
  });
  await run();
  assert.equal(state.pagesFetched, 1);
  assert.equal(state.writes.get('/tmp/pr-diff.txt').split('\n').length, 4000);
  assert.ok(!state.writes.get('/tmp/pr-diff.txt').includes('must-not-fetch'));
});

test('stops within a page when a file exactly fills the remaining sample', async () => {
  const { run, state } = fixture({
    error: oversizedDiffError(),
    pages: [[file('first.ts', Array(3998).fill('+line').join('\n')), file('header-only.ts'), file('excluded.ts')]],
  });
  await run();
  const sample = state.writes.get('/tmp/pr-diff.txt');
  assert.equal(sample.split('\n').length, 4000);
  assert.ok(sample.endsWith('diff --git a/header-only.ts b/header-only.ts'));
  assert.ok(!sample.includes('excluded'));
});

test('identifies unavailable patches explicitly instead of inventing source changes', async () => {
  const { run, state } = fixture({
    error: oversizedDiffError(),
    pages: [[file('binary.png', null), file('omitted.ts', ''), { ...file('renamed.ts'), previous_filename: 'original.ts' }]],
  });
  await run();
  const sample = state.writes.get('/tmp/pr-diff.txt');
  assert.ok(sample.includes('[Patch unavailable: binary.png (modified, +1/-0)]'));
  assert.ok(sample.includes('[Patch unavailable: omitted.ts (modified, +1/-0)]'));
  assert.ok(sample.includes('diff --git a/original.ts b/renamed.ts\n+change'));
  assert.equal(state.warnings.length, 3);
});

for (const [name, error] of [
  ['authentication', oversizedDiffError(401)],
  ['authorization', oversizedDiffError(403)],
  ['not found', oversizedDiffError(404)],
  ['rate limiting', oversizedDiffError(429)],
  ['service failure', oversizedDiffError(500)],
  ['network failure', new Error('ECONNRESET')],
  ['unstructured 406', oversizedDiffError(406, null)],
  ['wrong resource', oversizedDiffError(406, [{ resource: 'Repository', field: 'diff', code: 'too_large' }])],
  ['wrong field', oversizedDiffError(406, [{ resource: 'PullRequest', field: 'body', code: 'too_large' }])],
  ['wrong code', oversizedDiffError(406, [{ resource: 'PullRequest', field: 'diff', code: 'invalid' }])],
  ['malformed errors', oversizedDiffError(406, 'too_large')],
]) {
  test(`rethrows ${name} without fallback or a success-shaped sample`, async () => {
    const { run, state } = fixture({ error });
    await assert.rejects(run, (actual) => actual === error);
    assert.equal(state.pagesFetched, 0);
    assert.ok(!state.writes.has('/tmp/pr-diff.txt'));
    assert.ok(!state.writes.has('/tmp/validation-result.json'));
  });
}

test('propagates listFiles failures without writing a partial sample or verdict', async () => {
  const pageError = new Error('Pagination network error');
  const { run, state } = fixture({ error: oversizedDiffError(), pages: [[file('partial.ts')]], pageError });
  await assert.rejects(run, (error) => error === pageError);
  assert.ok(!state.writes.has('/tmp/pr-diff.txt'));
  assert.ok(!state.writes.has('/tmp/validation-result.json'));
});

test('rejects empty oversized-diff file listings instead of silently validating an empty sample', async () => {
  const { run, state } = fixture({ error: oversizedDiffError(), pages: [[]] });
  await assert.rejects(run, /No files returned for the oversized PR diff/);
  assert.ok(!state.writes.has('/tmp/pr-diff.txt'));
});

test('retrieval success alone never posts approval, labels or an AI verdict', async () => {
  const { run, post, state } = fixture({ error: oversizedDiffError(), pages: [[file('actual.ts')]] });
  await run();
  await post();
  assert.deepEqual([...state.writes.keys()], ['/tmp/pr-meta.json', '/tmp/pr-diff.txt']);
  assert.deepEqual(state.failures, []);
  assert.ok(state.logs.includes('No validation result. Skipping.'));
});

function promptSample(input, { missingInput = false, missingTemp = false, unreadableInput = false } = {}) {
  const sampler = workflow.match(/          # Cap the diff sample[\s\S]+?(?=          # Write combined prompt)/)?.[0];
  assert.ok(sampler, 'Missing actual prompt sampling block');
  const directory = mkdtempSync(join(tmpdir(), 'pr-ai-sampler-'));
  try {
    const inputPath = join(directory, 'input.diff');
    writeFileSync(inputPath, input);
    const script = sampler.replace('/tmp/pr-diff.txt', '"$SAMPLE_INPUT"');
    const result = spawnSync('bash', ['--noprofile', '--norc', '-e', '-o', 'pipefail', '-c', `${script}\nprintf '%s' "$PR_DIFF"`], {
      env: {
        ...process.env,
        RUNNER_TEMP: missingTemp ? join(directory, 'missing-temp') : directory,
        SAMPLE_INPUT: missingInput ? join(directory, 'missing.diff') : unreadableInput ? directory : inputPath,
      },
    });
    assert.ifError(result.error);
    const temporaryFiles = readdirSync(directory).filter((name) => name.startsWith('pr-diff-lines.'));
    return { ...result, temporaryFiles };
  } finally {
    rmSync(directory, { recursive: true });
  }
}

function assertSuccessfulSample(input) {
  const result = promptSample(input);
  assert.equal(result.status, 0, result.stderr.toString());
  assert.equal(result.signal, null);
  assert.equal(result.stderr.toString(), '');
  assert.deepEqual(result.temporaryFiles, []);
  return result.stdout;
}

test('the actual downstream shell command keeps only the first 2000 lines', () => {
  const lines = Array.from({ length: 3000 }, (_, i) => `+line ${i}`);
  assert.equal(assertSuccessfulSample(lines.join('\n')).toString(), lines.slice(0, 2000).join('\n'));
});

test('the actual downstream shell command caps long multibyte lines at 100000 bytes', () => {
  const sample = assertSuccessfulSample('\u00e9'.repeat(60000));
  assert.equal(sample.byteLength, 100000);
  assert.equal(sample.toString().length, 50000);
});

test('strict Actions Bash samples a two-megabyte line without producer SIGPIPE', () => {
  const sample = assertSuccessfulSample('x'.repeat(2000000));
  assert.equal(sample.byteLength, 100000);
  assert.equal(sample.toString(), 'x'.repeat(100000));
});

test('strict Actions Bash preserves the line bound with a multi-megabyte sample', () => {
  const line = `${'x'.repeat(999)}\n`;
  const sample = assertSuccessfulSample(`${line.repeat(2000)}excluded`);
  assert.equal(sample.toString(), line.repeat(100).replace(/\n+$/, ''));
});

test('strict Actions Bash preserves empty input and command-substitution trailing-newline semantics', () => {
  assert.equal(assertSuccessfulSample('').toString(), '');
  assert.equal(assertSuccessfulSample('+first\n+second\n\n').toString(), '+first\n+second');
  assert.equal(assertSuccessfulSample('+first\n+second').toString(), '+first\n+second');
});

for (const [name, options] of [
  ['missing diff', { missingInput: true }],
  ['unreadable diff', { unreadableInput: true }],
  ['temporary-file creation failure', { missingTemp: true }],
]) {
  test(`strict Actions Bash propagates ${name} without printing a successful sample`, () => {
    const result = promptSample('+actual', options);
    assert.notEqual(result.status, 0);
    assert.equal(result.stdout.byteLength, 0);
    assert.notEqual(result.stderr.byteLength, 0);
  });
}

test('runs the regression suite from the existing trusted checkout before gathering data', () => {
  const checkout = workflow.split('      - name: Checkout for prompt access\n')[1]?.split('\n      - name: ')[0];
  assert.ok(checkout?.includes('uses: actions/checkout@v5'));
  assert.ok(!checkout.includes('ref:'));
  assert.ok(!checkout.includes('repository:'));
  assert.ok(checkout.includes('            prompts/copilot-pr-desc-check.md'));
  assert.ok(checkout.includes('            .github/workflows/pr-ai-validation.yml'));
  assert.ok(checkout.includes('            scripts/pr-ai-validation.test.mjs'));
  assert.ok(checkout.includes('          sparse-checkout-cone-mode: false'));
  assert.ok(
    workflow.includes('      - name: Test PR validation data gathering\n        run: node --test scripts/pr-ai-validation.test.mjs')
  );
  assert.ok(workflow.indexOf('      - name: Test PR validation data gathering') < workflow.indexOf('      - name: Gather PR data'));
  assert.ok(workflow.includes('  pull_request_target:'));
});
