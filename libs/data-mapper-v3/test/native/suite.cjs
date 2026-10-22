const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');

const timeout = 30_000;
const viewType = 'biztalkDataMapper.mapEditor';

function findMapperFrame(browser) {
  return new Promise((resolve, reject) => {
    const disposers = [];
    let finished = false;
    const timer = setTimeout(() => finish(new Error('No visible native Mapper #btn-add-page frame within 30 seconds')), timeout);
    function finish(error, frame) {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      for (const dispose of disposers) {
        dispose();
      }
      if (error) {
        reject(error);
      } else {
        resolve(frame);
      }
    }
    function inspectFrame(frame) {
      frame
        .locator('#btn-add-page')
        .waitFor({ state: 'visible', timeout })
        .then(
          () => finish(null, frame),
          () => {}
        );
    }
    function inspectPage(page) {
      page.on('frameattached', inspectFrame);
      disposers.push(() => page.off('frameattached', inspectFrame));
      for (const frame of page.frames()) {
        inspectFrame(frame);
      }
    }
    for (const context of browser.contexts()) {
      context.on('page', inspectPage);
      disposers.push(() => context.off('page', inspectPage));
      for (const page of context.pages()) {
        inspectPage(page);
      }
    }
  });
}

function pageNames(xml) {
  const { XMLParser } = require(process.env.MAPPER_NATIVE_XML_PARSER);
  const parsed = new XMLParser({ ignoreAttributes: false }).parse(xml);
  const pages = parsed.mapsource.Pages.Page;
  return (Array.isArray(pages) ? pages : [pages]).map((page) => page['@_Name']);
}

function assertCustomTab(uri) {
  const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
  assert.ok(tab?.input instanceof vscode.TabInputCustom, 'The active tab must be a real custom editor');
  assert.equal(tab.input.viewType, viewType);
  assert.equal(tab.input.uri.toString(), uri.toString());
  return tab;
}

async function clickAndObserveDocument(frame, document) {
  let subscription;
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Real add-page click did not update the native document within 30 seconds')), timeout);
      subscription = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document === document && pageNames(document.getText()).length === 2) {
          resolve();
        }
      });
      frame.locator('#btn-add-page').click({ timeout }).catch(reject);
    });
  } finally {
    clearTimeout(timer);
    subscription?.dispose();
  }
}

exports.run = async () => {
  const started = Date.now();
  const root = process.env.MAPPER_NATIVE_ROOT;
  let browser;
  let frame;
  const assertions = [];
  const passed = (name) => {
    assertions.push(name);
    console.log(`PASS native: ${name}`);
  };
  try {
    const extension = vscode.extensions.getExtension('microsoft.btm-data-mapper');
    assert.ok(extension, 'Mapper development extension must be installed in the native host');
    await extension.activate();
    assert.equal(extension.isActive, true);
    passed('real extension activated');
    assert.equal(vscode.workspace.getConfiguration('files').get('autoSave'), 'off');
    const mapPath = path.join(process.env.MAPPER_NATIVE_WORKSPACE, 'NewMap.btm');
    await fs.copyFile(path.resolve(__dirname, '../../NewMap.btm'), mapPath);
    const uri = vscode.Uri.file(mapPath);
    const document = await vscode.workspace.openTextDocument(uri);
    assert.deepEqual(pageNames(document.getText()), ['Page 1']);
    assert.equal(document.isDirty, false);
    const originalVersion = document.version;
    const portFile = path.join(process.env.MAPPER_NATIVE_USER_DATA, 'DevToolsActivePort');
    const port = Number((await fs.readFile(portFile, 'utf8')).split('\n')[0]);
    assert.ok(Number.isInteger(port) && port > 0 && port < 65536, 'Native DevToolsActivePort must contain an ephemeral CDP port');
    const { chromium } = require(process.env.MAPPER_NATIVE_PLAYWRIGHT);
    try {
      browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout });
    } catch (error) {
      throw new Error(`Native loopback CDP failed at 127.0.0.1:${port}: ${error.message}`, { cause: error });
    }
    await vscode.commands.executeCommand('vscode.openWith', uri, viewType);
    assertCustomTab(uri);
    passed('vscode.openWith created TabInputCustom for the BTM');
    frame = await findMapperFrame(browser);
    await frame.waitForFunction(() => document.querySelectorAll('.page-tab').length === 1, null, { timeout });
    assert.deepEqual(
      (await frame.locator('.page-tab').allTextContents()).map((name) => name.trim()),
      ['Page 1']
    );
    passed('real webview rendered initial Page 1');
    await clickAndObserveDocument(frame, document);
    assert.ok(document.version > originalVersion, 'Native WorkspaceEdit must advance document.version');
    assert.equal(document.isDirty, true, 'Native WorkspaceEdit must dirty the TextDocument');
    assert.deepEqual(pageNames(document.getText()), ['Page 1', 'Page 2']);
    await frame.waitForFunction(() => document.querySelectorAll('.page-tab').length === 2, null, { timeout });
    passed('real add-page transport advanced document.version, dirtied BTM and added Page 2');
    assert.deepEqual(pageNames(await fs.readFile(mapPath, 'utf8')), ['Page 1']);
    passed('autosave disabled: physical BTM unchanged before save');
    assert.equal(await document.save(), true);
    assert.equal(document.isDirty, false);
    assert.deepEqual(pageNames(await fs.readFile(mapPath, 'utf8')), ['Page 1', 'Page 2']);
    passed('native save persisted both pages to the physical BTM');
    const tab = assertCustomTab(uri);
    assert.equal(await vscode.window.tabGroups.close(tab), true);
    assert.ok(
      !vscode.window.tabGroups.all
        .flatMap((group) => group.tabs)
        .some((entry) => entry.input instanceof vscode.TabInputCustom && entry.input.uri.toString() === uri.toString())
    );
    await vscode.commands.executeCommand('vscode.openWith', uri, viewType);
    assertCustomTab(uri);
    const reopenedFrame = await findMapperFrame(browser);
    assert.notEqual(reopenedFrame, frame, 'Reopen must create a new native webview frame');
    frame = reopenedFrame;
    await frame.waitForFunction(() => document.querySelectorAll('.page-tab').length === 2, null, { timeout });
    assert.deepEqual(
      (await frame.locator('.page-tab').allTextContents()).map((name) => name.trim()),
      ['Page 1', 'Page 2']
    );
    assert.deepEqual(pageNames(await fs.readFile(mapPath, 'utf8')), ['Page 1', 'Page 2']);
    passed('closed and reopened native custom editor rendered both persisted pages');
    console.log('SKIP native invalid-message case: acquired VS Code API is private; no second acquisition or synthetic MessageEvent used.');
    await fs.writeFile(
      path.join(root, 'result.json'),
      JSON.stringify(
        { status: 'passed', assertions, skipped: ['invalid incoming message: private acquired API'], runtimeMs: Date.now() - started },
        null,
        2
      )
    );
  } catch (error) {
    console.error(error.stack || String(error));
    if (browser) {
      console.error(
        `Native CDP frames: ${JSON.stringify(browser.contexts().flatMap((context) => context.pages().flatMap((page) => page.frames().map((entry) => entry.url()))))}`
      );
      await frame
        ?.page()
        .screenshot({ path: path.join(root, 'failure.png') })
        .catch(() => {});
    }
    await fs.writeFile(
      path.join(root, 'result.json'),
      JSON.stringify({ status: 'failed', assertions, error: error.stack || String(error) }, null, 2)
    );
    throw error;
  } finally {
    await browser?.close();
  }
};
