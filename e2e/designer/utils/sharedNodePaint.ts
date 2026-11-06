import { createHash } from 'node:crypto';
import { expect, type Page, type TestInfo } from '@playwright/test';

const edgeSelector = (id: string) => `.react-flow__edge[data-id="${id}"] .msla-shared-edge-path`;

async function findProbe(page: Page, agentId: string, edgeId: string) {
  return page.evaluate(
    ({ agentId, edgeId }) => {
      const paths = document.querySelectorAll(`.react-flow__edge[data-id="${CSS.escape(edgeId)}"] .msla-shared-edge-path`);
      const panels = document.querySelectorAll(`[data-agent-tools-decoration="${CSS.escape(agentId)}"]`);
      const path = paths[0];
      const panel = panels[0];
      if (paths.length !== 1 || !(path instanceof SVGPathElement) || panels.length !== 1 || !(panel instanceof HTMLElement)) {
        throw new Error(`Expected one actual visible stroke and accepted decoration: ${agentId}/${edgeId}`);
      }
      const matrix = path.getScreenCTM();
      const length = path.getTotalLength();
      const style = getComputedStyle(path);
      if (
        !matrix ||
        !length ||
        style.visibility !== 'visible' ||
        Number(style.opacity) === 0 ||
        Number(style.strokeOpacity) === 0 ||
        style.stroke === 'none'
      ) {
        throw new Error(`Named stroke has no visible screen geometry: ${edgeId}`);
      }
      const bounds = panel.getBoundingClientRect();
      const scale = Math.hypot(matrix.a, matrix.b);
      const panelStyle = getComputedStyle(panel);
      const interior = {
        left: bounds.left + Number.parseFloat(panelStyle.borderLeftWidth) * scale,
        top: bounds.top + Number.parseFloat(panelStyle.borderTopWidth) * scale,
        right: bounds.right - Number.parseFloat(panelStyle.borderRightWidth) * scale,
        bottom: bounds.bottom - Number.parseFloat(panelStyle.borderBottomWidth) * scale,
      };
      if (!Object.values(interior).every(Number.isFinite)) {
        throw new Error(`Accepted decoration must expose real border geometry: ${agentId}`);
      }
      const radius = Math.max(1, Math.ceil((Number.parseFloat(style.strokeWidth) * scale) / 2));
      const size = radius * 2 + 1;
      const obstacles = [
        ...document.querySelectorAll(
          [
            '[data-node-card]:not([data-node-card="agent"])',
            '[data-node-card]:not([data-node-card="agent"]) > *',
            '[data-node-card="agent"] > :not([data-testid="agent-tools-panel"]):not(:has([data-testid="agent-tools-panel"]))',
            '[data-node-id]:not([data-node-card="agent"])',
            `[data-agent-tools-decoration]:not([data-agent-tools-decoration="${CSS.escape(agentId)}"])`,
            '[data-handle]',
            '.react-flow__handle.source',
            '.react-flow__handle[data-port-contained="true"]',
            '[data-testid="node-output-handles"]',
            '[data-testid="node-tool-connector"]',
            '[data-badge-status]',
            '[data-testid="card-indicator-badges"]',
            '[data-branch]',
            '.edge-drop-zone-container',
            '[data-edge-control="terminal"] > svg',
            '.no-actions-text',
            'button',
            'h3',
            '[data-node-info-card]',
            'svg foreignObject',
          ].join(', ')
        ),
      ]
        .filter((element) => {
          const current = getComputedStyle(element);
          if (current.display === 'none' || current.visibility === 'hidden') {
            return false;
          }
          const rect = element.getBoundingClientRect();
          // Ancestor decoration encloses a nested Agent's panel below the same edges; it is not foreground content.
          return !(
            element.hasAttribute('data-agent-tools-decoration') &&
            rect.left <= bounds.left &&
            rect.top <= bounds.top &&
            rect.right >= bounds.right &&
            rect.bottom >= bounds.bottom
          );
        })
        .map((element) => element.getBoundingClientRect())
        .filter((rect) => rect.width > 0 && rect.height > 0);
      const dash = style.strokeDasharray === 'none' ? [] : style.strokeDasharray.split(/[ ,]+/).map(Number.parseFloat);
      const period = dash.reduce((sum, part) => sum + part, 0);
      const offset = Number.parseFloat(style.strokeDashoffset) || 0;
      let best: { x: number; y: number; width: number; height: number; clearance: number; distance: number } | undefined;
      const steps = Math.ceil(length * scale);
      for (let step = 1; step < steps; step++) {
        const distance = (length * step) / steps;
        // Locate an actual dash, not a dash gap; pixel comparison below still has to prove paint.
        if (period && (((distance + offset) % period) + period) % period >= dash[0]) {
          continue;
        }
        const point = path.getPointAtLength(distance).matrixTransform(matrix);
        const x = Math.floor(point.x) - radius;
        const y = Math.floor(point.y) - radius;
        if (
          x <= interior.left ||
          y <= interior.top ||
          x + size >= interior.right ||
          y + size >= interior.bottom ||
          x < 0 ||
          y < 0 ||
          x + size > innerWidth ||
          y + size > innerHeight
        ) {
          continue;
        }
        let clearance = Math.min(x - interior.left, y - interior.top, interior.right - x - size, interior.bottom - y - size);
        for (const rect of obstacles) {
          const dx = Math.max(rect.left - x - size, x - rect.right, 0);
          const dy = Math.max(rect.top - y - size, y - rect.bottom, 0);
          clearance = Math.min(clearance, Math.hypot(dx, dy));
        }
        if (clearance > 0 && (!best || clearance > best.clearance)) {
          best = { x, y, width: size, height: size, clearance, distance };
        }
      }
      if (!best) {
        throw new Error(`No open centerline clip strictly inside accepted panel for ${edgeId}`);
      }
      return {
        clip: { x: best.x, y: best.y, width: best.width, height: best.height },
        distance: best.distance,
        clearance: best.clearance,
        panel: { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height },
        interior,
        stroke: { width: style.strokeWidth, color: style.stroke, dash: style.strokeDasharray },
      };
    },
    { agentId, edgeId }
  );
}

export async function captureEdgePaint(page: Page, testInfo: TestInfo, agentId: string, edgeId: string, label = 'visible') {
  await page.evaluate(() => document.fonts.ready.then(() => undefined));
  const probe = await findProbe(page, agentId, edgeId);
  const path = page.locator(edgeSelector(edgeId));
  await expect(path).toHaveCount(1);
  const element = await path.elementHandle();
  if (!element) {
    throw new Error(`Named stroke unmounted before paint capture: ${edgeId}`);
  }
  const geometry = () =>
    element.evaluate((path, agentId) => {
      if (!(path instanceof SVGPathElement) || !path.isConnected) {
        throw new Error('The identical SVG stroke must stay mounted throughout the paint cycle.');
      }
      const matrix = path.getScreenCTM();
      if (!matrix) {
        throw new Error('The named SVG stroke lost its screen transform.');
      }
      const style = getComputedStyle(path);
      const panels = document.querySelectorAll(`[data-agent-tools-decoration="${CSS.escape(agentId)}"]`);
      if (panels.length !== 1) {
        throw new Error('The identical accepted panel must stay mounted throughout the paint cycle.');
      }
      const { x, y, width, height } = panels[0].getBoundingClientRect();
      return {
        id: path.id,
        d: path.getAttribute('d'),
        matrix: [matrix.a, matrix.b, matrix.c, matrix.d, matrix.e, matrix.f],
        stroke: style.stroke,
        width: style.strokeWidth,
        dash: style.strokeDasharray,
        panel: { x, y, width, height },
      };
    }, agentId);
  const original = await element.getAttribute('style');
  const before = await geometry();
  const pair = async () => ({
    first: await page.screenshot({ clip: probe.clip, type: 'png', animations: 'disabled', caret: 'hide', scale: 'css' }),
    second: await page.screenshot({ clip: probe.clip, type: 'png', animations: 'disabled', caret: 'hide', scale: 'css' }),
  });
  const visible = await pair();
  let hidden: Awaited<ReturnType<typeof pair>> | undefined;
  let restored: Awaited<ReturnType<typeof pair>> | undefined;
  let hiddenGeometry: Awaited<ReturnType<typeof geometry>> | undefined;
  try {
    await element.evaluate((path) => path.style.setProperty('visibility', 'hidden', 'important'));
    hidden = await pair();
    hiddenGeometry = await geometry();
  } finally {
    await element.evaluate((path, original) => {
      if (original === null) {
        path.removeAttribute('style');
      } else {
        path.setAttribute('style', original);
      }
    }, original);
    restored = await pair();
  }
  if (!hidden || !restored) {
    throw new Error(`Incomplete visible/hidden/restored paint cycle: ${edgeId}`);
  }
  const after = await geometry();
  const restoredStyle = await element.getAttribute('style');
  const states = { visible, hidden, restored };
  for (const [state, images] of Object.entries(states)) {
    await testInfo.attach(`${label}-${edgeId}-${state}`, { body: images.first, contentType: 'image/png' });
    await testInfo.attach(`${label}-${edgeId}-${state}-repeat`, { body: images.second, contentType: 'image/png' });
  }
  await testInfo.attach(`${label}-${edgeId}-probe`, {
    body: JSON.stringify({
      environment: 'Mock Standalone, not native Azure Portal',
      ciCommit: process.env.GITHUB_SHA,
      agentId,
      edgeId,
      label,
      probe,
      geometry: { before, hidden: hiddenGeometry, after },
      originalStyle: original,
      restoredStyle,
      hashes: Object.fromEntries(
        Object.entries(states).map(([state, images]) => [
          state,
          [images.first, images.second].map((image) => createHash('sha256').update(image).digest('hex')),
        ])
      ),
    }),
    contentType: 'application/json',
  });
  expect(hiddenGeometry).toEqual(before);
  expect(after).toEqual(before);
  expect(restoredStyle).toBe(original);
  expect(before.panel).toEqual(probe.panel);
  for (const [state, images] of Object.entries(states)) {
    // Same encoder/options and repeated unchanged captures must be deterministic before byte comparison is evidence.
    expect(images.first.equals(images.second), `${edgeId}: unstable ${state} PNG encoding/render`).toBe(true);
  }
  expect(visible.first.equals(restored.first), `${edgeId}: restoring the exact style must restore identical paint`).toBe(true);
  return { contributes: !visible.first.equals(hidden.first) };
}

export async function expectEdgePaint(page: Page, testInfo: TestInfo, agentId: string, edgeId: string) {
  const result = await captureEdgePaint(page, testInfo, agentId, edgeId);
  expect(result.contributes, `${edgeId}: named stroke must contribute pixels inside the opaque panel`).toBe(true);
}

export async function expectOpaqueForegroundNegative(page: Page, testInfo: TestInfo, agentId: string, edgeId: string) {
  const panel = page.locator(`[data-testid="agent-tools-panel"][data-agent-id="${agentId}"]`);
  const decoration = page.locator(`[data-agent-tools-decoration="${agentId}"]`);
  const original = await panel.getAttribute('style');
  const background = await decoration.evaluate((element) => getComputedStyle(element).backgroundColor);
  try {
    // Controlled original-condition negative, not execution of an old-source build.
    await panel.evaluate((element, background) => element.style.setProperty('background-color', background, 'important'), background);
    const result = await captureEdgePaint(page, testInfo, agentId, edgeId, 'controlled-opaque-foreground-negative');
    expect(result.contributes, 'The same probe must reject the previous opaque-foreground condition.').toBe(false);
  } finally {
    await panel.evaluate((element, original) => {
      if (original === null) {
        element.removeAttribute('style');
      } else {
        element.setAttribute('style', original);
      }
    }, original);
  }
  await expectEdgePaint(page, testInfo, agentId, edgeId);
}
