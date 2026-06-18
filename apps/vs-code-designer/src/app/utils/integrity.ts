/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * vscode-free integrity helpers. Importable from both the extension host
 * (binaries.ts) and from ExTester / Mocha tests that cannot pull in the
 * `vscode` module.
 */
import axios from 'axios';
import { createHash } from 'crypto';
import * as fs from 'fs';

/**
 * Error thrown when a downloaded file fails integrity verification
 * (size or MD5 mismatch against the response headers).
 */
export class DownloadIntegrityError extends Error {
  constructor(
    public readonly url: string,
    public readonly reason: 'size' | 'md5',
    public readonly expected: string,
    public readonly actual: string
  ) {
    super(`Download integrity check failed for ${url}: ${reason} mismatch (expected ${expected}, got ${actual}).`);
    this.name = 'DownloadIntegrityError';
  }
}

export interface DownloadAttemptResult {
  expectedSize?: number;
  actualSize: number;
  expectedMd5?: string;
  actualMd5: string;
}

export const DEFAULT_DOWNLOAD_MAX_ATTEMPTS = 3;

/**
 * Optional callbacks the extension host plugs in so log + telemetry stays in
 * its own layer; in tests we leave these undefined.
 */
export interface DownloadHooks {
  onAttempt?: (attempt: number, error: unknown, willRetry: boolean) => void;
  onSuccess?: (attempt: number, result: DownloadAttemptResult, durationMs: number) => void;
}

/**
 * Streams a file from `url` to `destPath`, verifying integrity against
 * `Content-Length` and `Content-MD5` response headers when present.
 *
 * Azure Blob Storage (which backs cdn.functions.azure.com) sets both headers
 * on upload, so this catches CDN-edge truncation/corruption end-to-end without
 * any publishing-pipeline changes.
 *
 * Retries on network errors and integrity failures with exponential backoff.
 */
export async function downloadFileWithVerification(
  url: string,
  destPath: string,
  options: { maxAttempts?: number; hooks?: DownloadHooks } = {}
): Promise<DownloadAttemptResult> {
  const maxAttempts = options.maxAttempts ?? DEFAULT_DOWNLOAD_MAX_ATTEMPTS;
  const hooks = options.hooks ?? {};
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const attemptStart = Date.now();
    try {
      const result = await downloadFileAttempt(url, destPath);
      hooks.onSuccess?.(attempt, result, Date.now() - attemptStart);
      return result;
    } catch (error) {
      lastError = error;
      try {
        if (fs.existsSync(destPath)) {
          fs.rmSync(destPath, { force: true });
        }
      } catch {
        // best-effort cleanup
      }

      const isRetryable = isRetryableDownloadError(error);
      const willRetry = isRetryable && attempt < maxAttempts;
      hooks.onAttempt?.(attempt, error, willRetry);

      if (!willRetry) {
        throw error;
      }
      await delay(1000 * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

function downloadFileAttempt(url: string, destPath: string): Promise<DownloadAttemptResult> {
  return new Promise<DownloadAttemptResult>((resolve, reject) => {
    axios
      .get(url, { responseType: 'stream' })
      .then((response) => {
        const headers = response.headers ?? {};
        const contentLengthRaw = headers['content-length'] ?? headers['Content-Length'];
        const expectedSize = contentLengthRaw === undefined ? undefined : Number.parseInt(String(contentLengthRaw), 10);
        const expectedMd5Raw = headers['content-md5'] ?? headers['Content-MD5'];
        const expectedMd5 = typeof expectedMd5Raw === 'string' && expectedMd5Raw.length > 0 ? expectedMd5Raw : undefined;

        const writer = fs.createWriteStream(destPath);
        const hash = createHash('md5');
        let actualSize = 0;
        let settled = false;

        const settle = (fn: () => void) => {
          if (settled) {
            return;
          }
          settled = true;
          fn();
        };

        response.data.on('data', (chunk: Buffer) => {
          actualSize += chunk.length;
          hash.update(new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength));
        });
        response.data.on('error', (err: Error) => settle(() => reject(err)));
        writer.on('error', (err: Error) => settle(() => reject(err)));
        writer.on('finish', () =>
          settle(() => {
            if (expectedSize !== undefined && Number.isFinite(expectedSize) && actualSize !== expectedSize) {
              reject(new DownloadIntegrityError(url, 'size', String(expectedSize), String(actualSize)));
              return;
            }
            const actualMd5 = hash.digest('base64');
            if (expectedMd5 && actualMd5 !== expectedMd5) {
              reject(new DownloadIntegrityError(url, 'md5', expectedMd5, actualMd5));
              return;
            }
            resolve({ expectedSize, actualSize, expectedMd5, actualMd5 });
          })
        );

        response.data.pipe(writer);
      })
      .catch((err) => reject(err));
  });
}

export function isRetryableDownloadError(error: unknown): boolean {
  if (error instanceof DownloadIntegrityError) {
    return true;
  }
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (typeof status === 'number') {
    return status >= 500 && status < 600;
  }
  return true;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Issues a HEAD request against `url` and returns the published `Content-MD5`
 * (base64) value, if any. Returns `undefined` when the header is missing.
 * Throws when the request itself fails so callers can decide whether to
 * fall back gracefully.
 */
export async function fetchExpectedMd5(url: string): Promise<string | undefined> {
  const response = await axios.head(url);
  const headers = response.headers ?? {};
  const expectedMd5Raw = headers['content-md5'] ?? headers['Content-MD5'];
  if (typeof expectedMd5Raw === 'string' && expectedMd5Raw.length > 0) {
    return expectedMd5Raw;
  }
  return undefined;
}
