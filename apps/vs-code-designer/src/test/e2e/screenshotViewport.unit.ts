import * as assert from 'node:assert/strict';
import { test } from 'node:test';
import { assertEvidenceScreenshotDimensions, prepareEvidenceScreenshotViewport, readScreenshotPngDimensions } from './screenshotViewport';

/** Header-only control: native proof separately decodes the real CDP PNG. */
export function pngHeader(width = 3840, height = 2160): Buffer {
  const header = Buffer.alloc(33);
  Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]).copy(header);
  header.writeUInt32BE(13, 8);
  header.write('IHDR', 12, 'ascii');
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  return header;
}

test('4K uses top-level CSS metrics, explicit DPR1 and the remaining deadline', async () => {
  const calls: unknown[][] = [];
  await prepareEvidenceScreenshotViewport(
    {
      targetUrl: 'vscode-file://vscode-app/resources/app/out/vs/code/electron-browser/workbench/workbench.html',
      async send(...args) {
        calls.push(args);
        return {};
      },
    },
    Date.now() + 500
  );
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 'Emulation.setDeviceMetricsOverride');
  assert.deepEqual(calls[0][1], {
    width: 3840,
    height: 2160,
    deviceScaleFactor: 1,
    mobile: false,
    screenWidth: 3840,
    screenHeight: 2160,
  });
  const options = calls[0][2] as { timeoutMs: number };
  assert.ok(options.timeoutMs > 0 && options.timeoutMs <= 500);
});

test('foreign webview and expired budget never send metrics; protocol errors propagate', async () => {
  let sends = 0;
  const protocolError = new Error('Emulation not supported');
  const cdp = {
    async send() {
      sends++;
      throw protocolError;
    },
  };
  await assert.rejects(
    prepareEvidenceScreenshotViewport({ ...cdp, targetUrl: 'vscode-webview://foreign' }, Date.now() + 5000),
    /owning workbench/
  );
  await assert.rejects(prepareEvidenceScreenshotViewport(cdp, Date.now()), /deadline expired/);
  assert.equal(sends, 0);
  await assert.rejects(prepareEvidenceScreenshotViewport(cdp, Date.now() + 5000), (error) => error === protocolError);
});

test('PNG IHDR is measured independently; lower resolution, DPR2 and malformed data fail closed', () => {
  assert.deepEqual(readScreenshotPngDimensions(pngHeader()), { width: 3840, height: 2160 });
  assertEvidenceScreenshotDimensions(pngHeader());
  for (const [width, height] of [
    [1024, 768],
    [1440, 900],
    [1920, 1080],
    [7680, 4320],
  ]) {
    assert.throws(() => assertEvidenceScreenshotDimensions(pngHeader(width, height)), new RegExp(`${width}x${height}`));
  }
  for (const invalid of [Buffer.from('not a PNG'), pngHeader().subarray(0, 24), Buffer.alloc(33), pngHeader(0, 2160)]) {
    assert.throws(() => assertEvidenceScreenshotDimensions(invalid), /PNG/);
  }
});
