const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const vscode = require('vscode');
const { findMapperFrame } = require('./suite.cjs');
const { buildLearningPathHelpers } = require('./buildLearningPathHelpers.cjs');
const { compareLearningPathPaths, getLearningPathExclusion } = require('./learningPathExclusions.cjs');

const extensionPath = path.resolve(__dirname, '../..');
const viewType = 'biztalkDataMapper.mapEditor';

async function mapFiles(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const paths = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(directory, entry.name);
      return entry.isDirectory() ? mapFiles(fullPath) : entry.name.endsWith('.btm') ? [fullPath] : [];
    })
  );
  return paths.flat().sort(compareLearningPathPaths);
}

function failureStage(output) {
  if (output.includes('Output validation failed:')) {
    return 'output-validation';
  }
  if (output.includes('Compilation failed:')) {
    return 'compile';
  }
  if (output.includes('transformation failed') || output.includes('Transform produced empty output')) {
    return 'transform';
  }
  if (output.includes('Input validation failed:')) {
    return 'input';
  }
  return 'generate-instance';
}

exports.run = async () => {
  const started = Date.now();
  const root = process.env.MAPPER_NATIVE_ROOT;
  const reportDirectory = process.env.MAPPER_NATIVE_REPORT;
  const workspace = process.env.MAPPER_NATIVE_WORKSPACE;
  const report = { status: 'running', total: 0, succeeded: 0, failed: 0, skipped: 0, results: [] };
  let browser;
  const saveReport = async () => {
    report.runtimeMs = Date.now() - started;
    await fs.writeFile(path.join(reportDirectory, 'result.json'), JSON.stringify(report, null, 2));
    await fs.writeFile(path.join(root, 'result.json'), JSON.stringify(report, null, 2));
  };
  try {
    const extension = vscode.extensions.getExtension('microsoft.btm-data-mapper');
    assert.ok(extension, 'Mapper development extension must be installed');
    await extension.activate();
    await fs.cp(path.join(extensionPath, 'e2etests'), workspace, { recursive: true });
    buildLearningPathHelpers(workspace);
    const corpus = await mapFiles(workspace);
    assert.equal(corpus.length, 151, 'The entire learning-path corpus must be available');
    const filter = process.env.MAPPER_NATIVE_MAP_FILTER;
    const maps = filter ? corpus.filter((mapPath) => path.relative(workspace, mapPath).includes(filter)) : corpus;
    assert.ok(maps.length > 0, 'No maps match the requested filter');
    report.total = maps.length;
    report.filter = filter || null;
    const portFile = path.join(process.env.MAPPER_NATIVE_USER_DATA, 'DevToolsActivePort');
    const port = Number((await fs.readFile(portFile, 'utf8')).split('\n')[0]);
    assert.ok(Number.isInteger(port) && port > 0 && port < 65536);
    const { chromium } = require(process.env.MAPPER_NATIVE_PLAYWRIGHT);
    const { XMLParser, XMLValidator } = require(process.env.MAPPER_NATIVE_XML_PARSER);
    const mapParser = new XMLParser({ ignoreAttributes: false });
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`, { timeout: 30_000 });

    for (const [index, mapPath] of maps.entries()) {
      const relativePath = path.relative(workspace, mapPath);
      const caseId = String(corpus.indexOf(mapPath) + 1).padStart(3, '0');
      const exclusion = getLearningPathExclusion(relativePath);
      if (exclusion) {
        report.skipped++;
        report.results.push({ map: relativePath, caseId, status: 'skipped', reason: exclusion });
        await saveReport();
        console.log(`SKIP Test Map ${index + 1}/${maps.length}: ${relativePath} (${exclusion})`);
        continue;
      }
      const artifactDirectory = path.join(reportDirectory, caseId);
      await fs.mkdir(artifactDirectory);
      const result = { map: relativePath, caseId, status: 'running', artifacts: path.basename(artifactDirectory) };
      const mapStarted = Date.now();
      let frame;
      try {
        const mapXml = mapParser.parse(await fs.readFile(mapPath, 'utf16le'));
        const outputMethod = (mapXml.mapsource['@_method'] || 'xml').toLowerCase();
        await vscode.commands.executeCommand('workbench.action.closeAllEditors');
        const uri = vscode.Uri.file(mapPath);
        await vscode.commands.executeCommand('vscode.openWith', uri, viewType);
        const tab = vscode.window.tabGroups.activeTabGroup.activeTab;
        assert.ok(tab?.input instanceof vscode.TabInputCustom);
        assert.equal(tab.input.uri.toString(), uri.toString());
        frame = await findMapperFrame(browser);
        await frame.locator('#btn-test-map').click({ timeout: 30_000 });
        const input = frame.locator('biztalk-mapper-bottom-panel textarea');
        const output = frame.locator('biztalk-mapper-bottom-panel pre');
        let state;
        const deadline = Date.now() + 150_000;
        while (Date.now() < deadline) {
          state = { input: await input.inputValue(), output: (await output.textContent()) || '' };
          if (state.output.trim() || (state.input.trim() && !state.input.trimStart().startsWith('<'))) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
        assert.ok(state?.output.trim() || state?.input.trim(), 'Native Test Map did not produce input or output');
        if (!state.output.trim() && state.input.trimStart().startsWith('<')) {
          throw new Error('Native Test Map did not finish within 150 seconds');
        }
        await fs.writeFile(path.join(artifactDirectory, 'input.xml'), state.input);
        await fs.writeFile(path.join(artifactDirectory, 'test-output.txt'), state.output);
        if (state.output.includes('Map compiled successfully')) {
          const xsltPath = path.join(path.dirname(mapPath), '__generated', `${path.basename(mapPath, '.btm')}.xslt`);
          await fs.copyFile(xsltPath, path.join(artifactDirectory, 'compiled.xslt'));
        }
        if (state.output.startsWith('Error:') || !state.output.trim()) {
          result.status = 'failed';
          result.stage = failureStage(state.output);
          result.error = state.output || state.input;
        } else {
          assert.ok(state.output.includes('Output saved:'), 'Native Test Map must report a saved output file');
          const separator = '─'.repeat(50);
          const marker = state.output.lastIndexOf(separator);
          assert.ok(marker >= 0, 'Native Test Map must include actual transform output');
          const actualOutput = state.output.slice(marker + separator.length).trim();
          const outputExtension = outputMethod === 'text' ? 'txt' : outputMethod === 'html' ? 'html' : 'xml';
          await fs.writeFile(path.join(artifactDirectory, `output.${outputExtension}`), actualOutput);
          const validation = outputMethod === 'xml' ? XMLValidator.validate(actualOutput) : true;
          if (validation !== true) {
            result.status = 'failed';
            result.stage = 'output-validation';
            result.error = `Native Test Map reported success but emitted invalid XML: ${JSON.stringify(validation)}`;
          } else {
            result.status = 'passed';
            result.stage = 'complete';
          }
        }
      } catch (error) {
        result.status = 'failed';
        result.stage = 'native-harness';
        result.error = error.stack || String(error);
        await frame
          ?.page()
          .screenshot({ path: path.join(artifactDirectory, 'failure.png') })
          .catch(() => {});
      }
      result.runtimeMs = Date.now() - mapStarted;
      report.results.push(result);
      report[result.status === 'passed' ? 'succeeded' : 'failed']++;
      await saveReport();
      console.log(`${result.status === 'passed' ? 'PASS' : 'FAIL'} Test Map ${index + 1}/${maps.length}: ${relativePath}`);
      if (result.error) {
        console.log(result.error.split('\n').filter(Boolean).slice(-2).join('\n'));
      }
    }
    report.status = report.failed === 0 ? 'passed' : 'failed';
    await saveReport();
    console.log(`Native Test Map: ${report.succeeded} succeeded, ${report.failed} failed, ${report.skipped} skipped; ${reportDirectory}`);
    if (report.failed > 0) {
      throw new Error(`${report.failed}/${report.total} native Test Map operations failed; see ${reportDirectory}`);
    }
  } catch (error) {
    report.status = 'failed';
    report.error = error.stack || String(error);
    await saveReport();
    throw error;
  } finally {
    await browser?.close();
  }
};
