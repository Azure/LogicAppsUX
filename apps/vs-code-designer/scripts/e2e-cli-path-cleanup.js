/* global module, require, setTimeout */
const fs = require('node:fs');

const TRANSIENT_REMOVAL_CODES = new Set(['EACCES', 'EBUSY', 'ENOTEMPTY', 'EPERM']);

function getErrorCode(error) {
  return error && typeof error === 'object' && typeof error.code === 'string' ? error.code : '';
}

function createLingeringPathError(targetPath) {
  const error = new Error(`Path still exists after recursive removal: ${targetPath}`);
  error.code = 'ENOTEMPTY';
  return error;
}

async function removePathWithRetry(
  targetPath,
  {
    timeoutMs = 30_000,
    retryDelayMs = 250,
    now = Date.now,
    sleep = (delayMs) => new Promise((resolve) => setTimeout(resolve, delayMs)),
    remove = (candidate) => fs.rmSync(candidate, { recursive: true, force: true }),
    exists = fs.existsSync,
    onRetry = () => {},
  } = {}
) {
  const startedAt = now();
  let attempts = 0;
  let lastError;

  while (true) {
    attempts += 1;
    try {
      remove(targetPath);
      if (!exists(targetPath)) {
        return { verified: true, attempts, elapsedMs: Math.max(0, now() - startedAt) };
      }
      throw createLingeringPathError(targetPath);
    } catch (error) {
      lastError = error;
      const code = getErrorCode(error);
      const elapsedMs = Math.max(0, now() - startedAt);
      if (!TRANSIENT_REMOVAL_CODES.has(code)) {
        throw error;
      }
      const remainingMs = timeoutMs - elapsedMs;
      if (remainingMs <= 0) {
        const timeoutError = new Error(
          `Unable to remove path within ${timeoutMs}ms after ${attempts} attempt(s): ${targetPath} (${code || 'unknown'})`,
          { cause: lastError }
        );
        timeoutError.code = code || 'EUNKNOWN';
        throw timeoutError;
      }
      onRetry({ targetPath, attempts, elapsedMs, remainingMs, code });
      await sleep(Math.min(retryDelayMs, remainingMs));
    }
  }
}

module.exports = { TRANSIENT_REMOVAL_CODES, removePathWithRetry };
