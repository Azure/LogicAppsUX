const { chromium, expect } = require('@playwright/test');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');

const workspace = path.resolve(__dirname, '../../../..');
const mapText = `$version: 1
$input: XML
$output: XML
$sourceSchema: Source.xsd
$targetSchema: Target.xsd
$sourceNamespaces:
  ns0: http://tempuri.org/source.xsd
$targetNamespaces:
  ns0: http://tempuri.org/Target.xsd
ns0:Root:
  DirectTranslation:
    Employee:
      ID: /ns0:Root/DirectTranslation/EmployeeID
  Looping:
    $for(/ns0:Root/CumulativeExpression/Population/State/County/Person):
      Person:
        Name: Name
`;

async function measurements(page, collapsed = false) {
  return page.evaluate(
    ({ collapsed }) => {
      const handles = Array.from(document.querySelectorAll('.react-flow__handle[data-handleid]'));
      const center = (handle) => {
        const bounds = handle.getBoundingClientRect();
        return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, width: bounds.width, height: bounds.height };
      };
      return Array.from(document.querySelectorAll('[id$="_customEdge"] path')).flatMap((edge) => {
        const ids = edge.parentElement.id.replace(/_customEdge$/, '').split('__edge__');
        return ids.flatMap((id, index) => {
          if (!id.startsWith('source-') && !id.startsWith('target-')) {
            return [];
          }
          const endpoint = edge.getPointAtLength(index === 0 ? 0 : edge.getTotalLength()).matrixTransform(edge.getScreenCTM());
          const resolvedId = collapsed ? `${index === 0 ? 'source' : 'target'}-/ns0:Root` : id;
          const direct = handles.find((handle) => handle.getAttribute('data-handleid') === resolvedId);
          const candidates = direct
            ? [direct]
            : handles.filter((handle) => {
                const handleId = handle.getAttribute('data-handleid');
                return index === 0 ? /^(top|bottom)-left/.test(handleId) : /^(top|bottom)-right/.test(handleId);
              });
          const nearest = candidates
            .map((handle) => ({ id: handle.getAttribute('data-handleid'), ...center(handle) }))
            .sort(
              (first, second) =>
                Math.hypot(endpoint.x - first.x, endpoint.y - first.y) - Math.hypot(endpoint.x - second.x, endpoint.y - second.y)
            )[0];
          return [
            {
              id,
              side: index === 0 ? 'source' : 'target',
              handle: nearest,
              endpoint: { x: endpoint.x, y: endpoint.y },
              error: nearest ? Math.hypot(endpoint.x - nearest.x, endpoint.y - nearest.y) : 10000,
            },
          ];
        });
      });
    },
    { collapsed }
  );
}

async function check(page, name, collapsed = false) {
  await expect
    .poll(
      async () => {
        const points = await measurements(page, collapsed);
        return points.length > 0 ? Math.max(...points.map((point) => point.error)) : 10000;
      },
      { message: `${name}: endpoints must meet measured handle centers`, timeout: 10000 }
    )
    .toBeLessThan(0.25);
  const points = await measurements(page, collapsed);
  console.log(
    JSON.stringify({ state: name, endpoints: points.length, maximumError: Math.max(...points.map((point) => point.error)), points })
  );
  await page.screenshot({ path: `${process.env.TEMP}/lml-connectors-${name}.png` });
  return points;
}

async function main() {
  let server;
  if (process.env.LML_BUNDLE) {
    server = http.createServer((request, response) => {
      if (request.url === '/') {
        response.end(
          '<!doctype html><html><head><link rel="stylesheet" href="/lml.css"></head><body><div id="root"></div><script src="/lml.js"></script></body></html>'
        );
      } else {
        const name = path.basename(request.url);
        response.setHeader('Content-Type', name.endsWith('.css') ? 'text/css' : 'text/javascript');
        response.end(fs.readFileSync(path.join(workspace, 'libs/data-mapper-v3/out/webview', name)));
      }
    });
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  }
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ ignoreHTTPSErrors: true, viewport: { width: 1440, height: 900 } });
    page.on('pageerror', (error) => console.error(error.message));
    if (server) {
      const schemas = Object.fromEntries(
        ['Source', 'Target'].map((name) => [
          name,
          JSON.parse(fs.readFileSync(path.join(workspace, `apps/Standalone/src/dataMapperV1/schemas/${name}Schema.json`), 'utf8')),
        ])
      );
      await page.addInitScript(
        ({ schemas, mapText }) => {
          window.acquireVsCodeApi = () => ({
            postMessage: (message) => {
              let result;
              if (message.method === 'initialize') {
                result = {
                  mapText,
                  xsltFilename: 'coordinates',
                  xsltContent: '',
                  schemaPaths: ['Source.xsd', 'Target.xsd'],
                  customXsltPaths: [],
                  revision: 0,
                  isDark: false,
                  isTestDisabledForOS: true,
                };
              } else if (message.method === 'getFunctionsManifest') {
                result = { version: '1', transformFunctions: [] };
              } else if (message.method === 'getSchemaFile') {
                result = schemas[message.params.schemaName.split('.')[0]];
              } else {
                result = [];
              }
              queueMicrotask(() => window.postMessage({ type: 'lmlResponse', id: message.id, result }, '*'));
            },
          });
        },
        { schemas, mapText }
      );
    }
    await page.goto(
      server ? `http://127.0.0.1:${server.address().port}/` : process.env.MAPPER_URL || 'https://127.0.0.1:4211/datamapperv2',
      { waitUntil: 'domcontentloaded', timeout: 120000 }
    );
    if (!server) {
      await page.getByText('Map Definition', { exact: true }).waitFor({ timeout: 120000 });
      await page.getByText('Select a map definition', { exact: true }).click();
      await page.getByRole('option', { name: 'Transcript', exact: true }).click();
    }
    await page
      .locator('[id$="_customEdge"] path')
      .first()
      .waitFor({ timeout: 30000 })
      .catch(async (error) => {
        console.error(await page.locator('body').innerText());
        throw error;
      });
    await page.evaluate(() => document.fonts.ready);
    await check(page, 'ordinary-repeating');
    const ordinary = page.locator('[data-handleid="source-/ns0:Root/DirectTranslation/EmployeeID"]');
    await ordinary.locator('..').locator('[class]').filter({ hasText: 'EmployeeID' }).last().dispatchEvent('click');
    await expect.poll(() => ordinary.evaluate((handle) => handle.getBoundingClientRect().width)).toBe(18);
    await check(page, 'selected');
    await page.setViewportSize({ width: 1180, height: 760 });
    await expect.poll(async () => (await page.locator('.react-flow__node-schemaPanel').nth(1).boundingBox()).x).toBeLessThan(1000);
    await check(page, 'resized');
    const scroll = async (side, top) =>
      page
        .locator('.react-flow__node-schemaPanel')
        .nth(side)
        .evaluate((panel, top) => {
          const hosts = Array.from(panel.querySelectorAll('div'))
            .reverse()
            .filter(
              (element) =>
                element.scrollHeight > element.clientHeight + 1 &&
                getComputedStyle(element).overflowY === 'auto' &&
                element.clientHeight > 100
            );
          let result = 0;
          for (const host of hosts) {
            host.style.scrollBehavior = 'auto';
            host.scrollTop = top;
            result = Math.max(result, host.scrollTop);
            if (top > 0 && result > 0) {
              break;
            }
          }
          return result;
        }, top);
    expect(await scroll(1, 420)).toBeGreaterThan(0);
    await check(page, 'target-scrolled');
    expect(await scroll(0, 420)).toBeGreaterThan(0);
    await check(page, 'both-scrolled');
    await scroll(0, 0);
    await scroll(1, 0);
    await check(page, 'scroll-reset');
    for (const side of [0, 1]) {
      await page
        .locator('.react-flow__node-schemaPanel')
        .nth(side)
        .getByRole('treeitem')
        .first()
        .locator('svg')
        .first()
        .dispatchEvent('click');
    }
    await check(page, 'collapsed', true);
    await page.setViewportSize({ width: 820, height: 680 });
    await check(page, 'compact-collapsed', true);
  } finally {
    await browser.close();
    server?.close();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
