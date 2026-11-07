import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import { inflateSync } from 'node:zlib';
import * as vscode from 'vscode';
import {
  type CdpConnection,
  connectToVsCodeCdpByText,
  connectToVsCodeWorkbenchCdp,
  hasExactVisibleWorkbenchIframeForTarget,
} from './cdpClient';
import { captureCliScreenshot, captureDiagnosticScreenshot, captureEvidenceScreenshot } from './screenshot';
import { evidenceScreenshotViewport, readScreenshotPngDimensions } from './screenshotViewport';

// Additive local-only @vscode/test-cli label. No Logic Apps activation, Azure,
// workspace generation, F5, Func population, or global process cleanup.
let teardownObserver: CdpConnection | undefined;
let originalViewport: { width: number; height: number; deviceScaleFactor: number } | undefined;
const viewportExpression =
  'new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve({width:innerWidth,height:innerHeight,deviceScaleFactor:devicePixelRatio}))))';

// Registered after screenshot.ts's invocation-owned session teardown. A passive
// observer proves automatic cleanup restores native metrics, then closes itself.
suiteTeardown(async () => {
  if (!teardownObserver) {
    return;
  }
  try {
    const restored = await teardownObserver.evaluate(undefined, viewportExpression, { timeoutMs: 3000 });
    assert.deepEqual(restored, originalViewport, 'Invocation teardown must release its emulation session');
    console.log(`[4k-proof] Invocation teardown restored native viewport: ${JSON.stringify(restored)}`);
  } finally {
    teardownObserver.dispose();
    teardownObserver = undefined;
  }
});

suite('Native 4K workbench renderer', () => {
  test('renders editor and responsive webview at 4K and preserves CSS pointer coordinates', async function () {
    this.timeout(120_000);
    const document = await vscode.workspace.openTextDocument({
      language: 'json',
      content: JSON.stringify(
        { description: 'Local 4K screenshot proof', actions: { Compose: { type: 'Compose', inputs: 'No Azure resources' } } },
        null,
        2
      ),
    });
    await vscode.window.showTextDocument(document, { viewColumn: vscode.ViewColumn.One });
    const panel = vscode.window.createWebviewPanel('screenshotResolution', '4K capture fixture', vscode.ViewColumn.Two, {
      enableScripts: true,
    });
    panel.webview.html = `<!DOCTYPE html><html><head>
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline';">
      <style>
        html,body{margin:0;height:100%;overflow:hidden;font:20px system-ui;color:#fff;background:#132738}
        main{box-sizing:border-box;height:100%;display:grid;grid-template:1fr 1fr/1fr 1fr;gap:2px;padding:12px}
        section{padding:24px;border:1px solid #87d1f0;background:linear-gradient(135deg,#234c63,#163044)}
        section:last-child{display:flex;flex-direction:column;justify-content:space-between;align-items:flex-end}
        button{font:20px system-ui;background:#b8e9a0;padding:12px;color:#132738;border:0}
      </style></head><body><main>
        <section>4K responsive webview<br>Top left — real CSS layout</section>
        <section>Top right — native raster, not upscaled</section>
        <section>Bottom left — full-height rendered content</section>
        <section>Bottom right<button id="probe">Click with CSS coordinates</button></section>
      </main><script>
        const api=acquireVsCodeApi();
        document.getElementById('probe').onclick=()=>{
          document.getElementById('probe').textContent='CSS pointer click passed';
          api.postMessage({clicked:true});
        };
      </script></body></html>`;
    let clicked = false;
    const listener = panel.webview.onDidReceiveMessage((message) => {
      clicked ||= message?.clicked === true;
    });
    const cdp = await connectToVsCodeWorkbenchCdp({ activate: false });
    teardownObserver = cdp;
    let webview: Awaited<ReturnType<typeof connectToVsCodeCdpByText>> | undefined;
    try {
      const nativeGeometry = await cdp.evaluate(
        undefined,
        '({outerWidth,outerHeight,innerWidth,innerHeight,devicePixelRatio,screenWidth:screen.width,screenHeight:screen.height})'
      );
      console.log(`[4k-proof] Original native geometry: ${JSON.stringify(nativeGeometry)}`);
      originalViewport = await cdp.evaluate(undefined, viewportExpression);
      // Electron may expose page CDP but not Browser window-control methods.
      // This diagnostic probe never substitutes native bounds for renderer proof.
      try {
        console.log(`[4k-proof] Browser window-control support: ${JSON.stringify(await cdp.send('Browser.getWindowForTarget'))}`);
      } catch (error) {
        console.log(`[4k-proof] Browser window-control unavailable: ${String(error)}`);
      }
      const standard = await captureEvidenceScreenshot(
        '4k-editor-webview',
        {
          kind: 'workbenchShell',
          label: '4k-editor-webview',
        },
        { binding: { activeTabText: ['4K capture fixture'] } }
      );
      assertReal4kRaster(fs.readFileSync(standard));
      const afterWrapper = await cdp.evaluate(undefined, viewportExpression);
      console.log(`[4k-proof] Standard evidence wrapper returned: ${JSON.stringify(afterWrapper)}`);
      assert.deepEqual(afterWrapper, evidenceScreenshotViewport, 'Standard wrapper must retain 4K between interactions');
      const before = await captureCliScreenshot('4k-standard-wrapper-repeat', {
        expectation: { kind: 'workbenchShell', label: '4k-standard-wrapper-repeat' },
        binding: { activeTabText: ['4K capture fixture'] },
      });
      assert.ok(before);
      assertReal4kRaster(fs.readFileSync(before));
      assert.deepEqual(await cdp.evaluate(undefined, viewportExpression), evidenceScreenshotViewport);
      await captureDiagnosticScreenshot('4k-diagnostic-wrapper', { reason: 'verify-transient-diagnostic-does-not-clear-owner' });
      assert.deepEqual(
        await cdp.evaluate(undefined, viewportExpression),
        evidenceScreenshotViewport,
        'A transient diagnostic connection must not clear the evidence owner'
      );
      webview = await connectToVsCodeCdpByText({
        targetName: '4K proof webview',
        urlIncludes: '',
        allTextIncludes: ['4K responsive webview', 'Click with CSS coordinates'],
        acceptCandidate: async (candidate) => {
          assert.ok(await hasExactVisibleWorkbenchIframeForTarget(cdp, candidate.targetUrl, 2000));
        },
      });
      const button = await webview.cdp.evaluate<{ x: number; y: number; width: number; height: number; dpr: number }>(
        webview.contextId,
        `(() => {const r=document.getElementById('probe').getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2,width:innerWidth,height:innerHeight,dpr:devicePixelRatio};})()`
      );
      assert.equal(button.dpr, 1);
      assert.ok(button.height > 1900, `Webview must reflow to the tall 4K workbench: ${JSON.stringify(button)}`);
      assert.ok(button.x > 0 && button.x < button.width && button.y > 1800 && button.y < button.height);
      for (const type of ['mouseMoved', 'mousePressed', 'mouseReleased']) {
        await webview.cdp.send('Input.dispatchMouseEvent', {
          type,
          x: button.x,
          y: button.y,
          button: type === 'mouseMoved' ? 'none' : 'left',
          clickCount: 1,
        });
      }
      const deadline = Date.now() + 5000;
      while (!clicked && Date.now() < deadline) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      assert.ok(clicked, 'Real webview pointer event must reach the lower-right CSS button');
      const after = await captureEvidenceScreenshot(
        '4k-css-pointer-passed',
        { kind: 'workbenchShell', label: '4k-css-pointer-passed' },
        {
          binding: { activeTabText: ['4K capture fixture'] },
        }
      );
      assert.ok(after);
      assertReal4kRaster(fs.readFileSync(after));
      assert.deepEqual(await cdp.evaluate(undefined, viewportExpression), evidenceScreenshotViewport);
      console.log(`[4k-proof] Renderer, decoded raster and CSS pointer passed: ${before}; ${after}`);
    } finally {
      webview?.cdp.dispose();
      listener.dispose();
      panel.dispose();
      await vscode.commands.executeCommand('workbench.action.closeAllEditors');
    }
  });
});

function assertReal4kRaster(png: Buffer): void {
  assert.deepEqual(readScreenshotPngDimensions(png), { width: 3840, height: 2160 });
  // Decode real IDAT streams too: a synthetic IHDR alone cannot pass native proof.
  assert.equal(png[24], 8, 'Expected an 8-bit CDP PNG');
  const channels = png[25] === 6 ? 4 : png[25] === 2 ? 3 : 0;
  assert.ok(channels, 'Expected RGB or RGBA CDP pixels');
  assert.equal(png[28], 0, 'Expected non-interlaced CDP PNG');
  const chunks: Buffer[] = [];
  for (let offset = 8; offset + 12 <= png.length; ) {
    const length = png.readUInt32BE(offset);
    assert.ok(offset + length + 12 <= png.length, 'PNG chunk must be complete');
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') {
      chunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
  }
  const pixels = inflateSync(Buffer.concat(chunks));
  assert.equal(pixels.length, (3840 * channels + 1) * 2160);
}
