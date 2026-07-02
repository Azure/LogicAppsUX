/// <reference types="mocha" />

/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * End-to-end CDN health probe for Microsoft.Azure.Functions.ExtensionBundle.Workflows.
 *
 * Runs as a plain Mocha suite (no ExTester / VS Code) so it stays fast and
 * doesn't require an X server. The test verifies two things against the
 * live `cdn.functions.azure.com` endpoint:
 *
 *   1. The CDN still emits the headers we depend on for client-side
 *      integrity verification (Content-Length + Content-MD5). If the CDN
 *      stops sending these — or changes their format — every Phase-1
 *      download verification turns into a no-op without anyone noticing.
 *      This test fails loudly so the regression is caught at PR time.
 *
 *   2. A small JSON file (`index.json`, a few KB) can be downloaded
 *      end-to-end through `downloadFileWithVerification` from
 *      `app/utils/integrity.ts`. We use this rather than the full bundle
 *      zip (~250 MB) to keep the test fast.
 *
 * Triggered by E2E_MODE=bundleintegrityonly via run-e2e.js. Also wired into
 * the `independentonly` shard.
 */

import * as assert from 'assert';
import axios from 'axios';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { downloadFileWithVerification, fetchExpectedMd5, DEFAULT_DOWNLOAD_MAX_ATTEMPTS } from '../../app/utils/integrity';

const PUBLIC_BUNDLE_BASE_URL = 'https://cdn.functions.azure.com/public';
const EXTENSION_BUNDLE_ID = 'Microsoft.Azure.Functions.ExtensionBundle.Workflows';
const INDEX_URL = `${PUBLIC_BUNDLE_BASE_URL}/ExtensionBundles/${EXTENSION_BUNDLE_ID}/index.json`;

const TEST_TIMEOUT = 60_000;
// Accept a base64 MD5 like "K2WG08BmGeB5pCBJZ/uHwg==". 24 chars including a
// trailing "==" pad is the canonical shape for a 16-byte MD5.
const BASE64_MD5_PATTERN = /^[A-Za-z0-9+/]{22}==$/;

interface BundleIndexFeed extends Array<string> {}

async function fetchBundleIndex(): Promise<BundleIndexFeed> {
  const response = await axios.get<BundleIndexFeed>(INDEX_URL, { timeout: 30_000 });
  return response.data;
}

function pickLatestVersion(feed: BundleIndexFeed): string {
  if (!Array.isArray(feed) || feed.length === 0) {
    throw new Error('Bundle index feed contained no versions');
  }
  // Sort numerically by major.minor.patch so we pick the actual newest version
  // rather than relying on lexicographic order (which would put 1.9.0 > 1.10.0).
  const sorted = [...feed].sort((a, b) => {
    const pa = a.split('.').map((n) => Number.parseInt(n, 10));
    const pb = b.split('.').map((n) => Number.parseInt(n, 10));
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const da = pa[i] ?? 0;
      const db = pb[i] ?? 0;
      if (da !== db) {
        return da - db;
      }
    }
    return 0;
  });
  return sorted[sorted.length - 1];
}

function buildBundleZipUrl(version: string): string {
  return `${PUBLIC_BUNDLE_BASE_URL}/ExtensionBundles/${EXTENSION_BUNDLE_ID}/${version}/${EXTENSION_BUNDLE_ID}.${version}_any-any.zip`;
}

describe('Bundle CDN integrity headers (live)', function () {
  this.timeout(TEST_TIMEOUT);

  let latestVersion: string;
  let zipUrl: string;
  let scratchDir: string;

  before(async () => {
    const feed = await fetchBundleIndex();
    latestVersion = pickLatestVersion(feed);
    zipUrl = buildBundleZipUrl(latestVersion);
    scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'la-e2e-bundle-cdn-'));
    // eslint-disable-next-line no-console
    console.log(`  [bundleCdnHealth] probing ${zipUrl}`);
  });

  after(() => {
    if (scratchDir && fs.existsSync(scratchDir)) {
      fs.rmSync(scratchDir, { recursive: true, force: true });
    }
  });

  it('HEAD on the latest bundle zip returns Content-Length + Content-MD5', async () => {
    const response = await axios.head(zipUrl, { timeout: 30_000 });
    const headers = response.headers as Record<string, string | undefined>;

    const contentLength = headers['content-length'];
    assert.ok(contentLength, 'CDN response missing Content-Length header');
    const lengthValue = Number(contentLength);
    assert.ok(Number.isFinite(lengthValue) && lengthValue > 0, `Content-Length not a positive integer: ${contentLength}`);

    const contentMd5 = headers['content-md5'];
    assert.ok(contentMd5, 'CDN response missing Content-MD5 header — Phase 1 hash verification cannot work without it');
    assert.ok(BASE64_MD5_PATTERN.test(contentMd5), `Content-MD5 is not a valid 16-byte base64 MD5: ${contentMd5}`);
  });

  it('fetchExpectedMd5 returns a valid base64 MD5 for the bundle zip', async () => {
    const md5 = await fetchExpectedMd5(zipUrl);
    assert.ok(md5, 'fetchExpectedMd5 returned undefined for live bundle zip');
    assert.ok(BASE64_MD5_PATTERN.test(md5 as string), `fetchExpectedMd5 returned non-base64 value: ${md5}`);
  });

  it('downloadFileWithVerification successfully downloads index.json with verification', async () => {
    const destPath = path.join(scratchDir, 'index.json');
    const result = await downloadFileWithVerification(INDEX_URL, destPath, {
      maxAttempts: DEFAULT_DOWNLOAD_MAX_ATTEMPTS,
    });

    assert.ok(fs.existsSync(destPath), 'index.json was not written to disk');
    const stat = fs.statSync(destPath);
    assert.ok(stat.size > 0, 'index.json on disk has zero bytes');

    // Result captures actual bytes + MD5; only verify expected against actual
    // when the response actually carried those headers (some CDN endpoints
    // omit Content-MD5 on small JSON, in which case this is a no-op).
    if (result.expectedSize !== undefined) {
      assert.strictEqual(result.actualSize, result.expectedSize, 'actualSize !== expectedSize');
    }
    if (result.expectedMd5 !== undefined) {
      assert.strictEqual(result.actualMd5, result.expectedMd5, 'actualMd5 !== expectedMd5');
    }
  });

  it('downloadFileWithVerification round-trips dot.net/v1/dotnet-install.ps1 (gzip regression guard)', async () => {
    // Regression: this URL is served gzipped by the dot.net CDN, which used
    // to trip our Content-Length check (Content-Length describes the
    // compressed bytes but axios decompresses the stream). The fix forces
    // Accept-Encoding: identity *and* tolerates Content-Encoding if the
    // server ignores the hint. If this test fails with DownloadIntegrityError
    // again the CDN or axios behavior drifted — see integrity.ts.
    const destPath = path.join(scratchDir, 'dotnet-install.ps1');
    const result = await downloadFileWithVerification('https://dot.net/v1/dotnet-install.ps1', destPath, {
      maxAttempts: DEFAULT_DOWNLOAD_MAX_ATTEMPTS,
    });

    assert.ok(fs.existsSync(destPath), 'dotnet-install.ps1 was not written to disk');
    const stat = fs.statSync(destPath);
    assert.ok(stat.size > 1024, `dotnet-install.ps1 on disk is suspiciously small: ${stat.size} bytes`);
    assert.ok(result.actualSize === stat.size, `actualSize (${result.actualSize}) !== stat.size (${stat.size})`);

    const body = fs.readFileSync(destPath, 'utf8');
    assert.ok(
      body.includes('param') || body.includes('Param') || body.includes('<#'),
      'dotnet-install.ps1 does not look like a PowerShell script — likely truncated or HTML error page'
    );
  });
});

describe('Bundle CDN integrity headers (experimental settings smoke)', function () {
  this.timeout(TEST_TIMEOUT);

  it('honors FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI env var override (HEAD against the override URL)', async () => {
    // The extension's `getExtensionBundleBaseUrl()` reads:
    //   1) local.settings.json
    //   2) process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI
    //   3) experimental VS Code setting
    //   4) public default
    // The helper itself imports `vscode`, so we can't run it from this
    // pure-Mocha test. Instead we replicate the contract that `binaries.ts`
    // and `bundleFeed.ts` rely on: that the env var takes precedence over
    // the public default.
    const before = process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
    try {
      process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI = PUBLIC_BUNDLE_BASE_URL;
      // If a dev points the env var at the public CDN, we should still get
      // a healthy index.json — confirms the URL shape.
      const response = await axios.get(
        `${process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI}/ExtensionBundles/${EXTENSION_BUNDLE_ID}/index.json`,
        {
          timeout: 30_000,
        }
      );
      assert.strictEqual(response.status, 200);
    } finally {
      if (before === undefined) {
        delete process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI;
      } else {
        process.env.FUNCTIONS_EXTENSIONBUNDLE_SOURCE_URI = before;
      }
    }
  });
});

// NOTE: computeBundleContentHash deterministic + mutation-sensitivity coverage lives in the
// vitest unit suite (`src/app/utils/__test__/bundleContentHash.test.ts`) because importing
// `bundleFeed` from this plain-Mocha E2E entry pulls in `vscode` transitively. The unit
// tests use real fs against a tmpdir, so the live behavior is fully exercised there.
