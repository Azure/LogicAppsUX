/* global require */
const assert = require('node:assert/strict');
const test = require('node:test');
const { removePathWithRetry } = require('./e2e-cli-path-cleanup');

function transient(code) {
  const error = new Error(code);
  error.code = code;
  return error;
}

test('recovers from bounded transient removal failures and verifies absence', async () => {
  let currentTime = 0;
  let attempts = 0;
  let present = true;
  const retries = [];
  const result = await removePathWithRetry('owned-root', {
    timeoutMs: 1000,
    retryDelayMs: 100,
    now: () => currentTime,
    sleep: async (delayMs) => {
      currentTime += delayMs;
    },
    remove: () => {
      attempts += 1;
      if (attempts < 3) {
        throw transient(attempts === 1 ? 'EBUSY' : 'EPERM');
      }
      present = false;
    },
    exists: () => present,
    onRetry: (retry) => retries.push(retry),
  });

  assert.deepEqual(result, { verified: true, attempts: 3, elapsedMs: 200 });
  assert.deepEqual(
    retries.map(({ attempts: retryAttempt, code }) => ({ attempts: retryAttempt, code })),
    [
      { attempts: 1, code: 'EBUSY' },
      { attempts: 2, code: 'EPERM' },
    ]
  );
});

test('retries a successful removal that leaves the path present', async () => {
  let currentTime = 0;
  let attempts = 0;
  let present = true;
  const result = await removePathWithRetry('owned-root', {
    timeoutMs: 1000,
    retryDelayMs: 50,
    now: () => currentTime,
    sleep: async (delayMs) => {
      currentTime += delayMs;
    },
    remove: () => {
      attempts += 1;
      if (attempts === 2) {
        present = false;
      }
    },
    exists: () => present,
  });

  assert.deepEqual(result, { verified: true, attempts: 2, elapsedMs: 50 });
});

test('fails immediately for non-transient errors', async () => {
  let sleeps = 0;
  await assert.rejects(
    removePathWithRetry('owned-root', {
      remove: () => {
        throw transient('EINVAL');
      },
      sleep: async () => {
        sleeps += 1;
      },
    }),
    (error) => error.code === 'EINVAL'
  );
  assert.equal(sleeps, 0);
});

test('fails after the absolute deadline without renewing the budget', async () => {
  let currentTime = 0;
  await assert.rejects(
    removePathWithRetry('owned-root', {
      timeoutMs: 250,
      retryDelayMs: 100,
      now: () => currentTime,
      sleep: async (delayMs) => {
        currentTime += delayMs;
      },
      remove: () => {
        throw transient('EBUSY');
      },
      exists: () => true,
    }),
    /Unable to remove path within 250ms after 4 attempt\(s\)/
  );
  assert.equal(currentTime, 250);
});
