import { expect, test, type Locator, type Page } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, setContextSetting } from './utils/sharedNodeUi';

const INSERT_NAME = 'Insert a new step between Init all and Compose';

type Box = { x: number; y: number; width: number; height: number };

const overlaps = (a: Box, b: Box) => a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  if (!box) {
    throw new Error('Expected a laid-out element.');
  }
  return box;
}

// Reach the control with real Tab presses: Fluent marks keyboard focus with data-fui-focus-visible,
// which programmatic focus() does not set.
async function tabTo(page: Page, target: Locator) {
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let presses = 0; presses < 80 && !(await target.evaluate((element) => element === document.activeElement)); presses++) {
    await page.keyboard.press('Tab');
  }
  await expect(target).toBeFocused();
}

/**
 * Insertion and direction must stay discoverable in both presentations. Flag-off runs pin the legacy
 * baseline (resting "+", SVG marker arrows, unchanged keyboard path); flag-on runs pin the shared
 * redesign keeping those good parts.
 */
for (const flag of ['false', 'true'] as const) {
  const shared = flag === 'true';

  test.describe(`Insertion and direction with useSharedNodeUi=${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('shows the insert "+" at rest on every editable edge without hover', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      await page.mouse.move(1, 1);
      const inserts = page.getByRole('button', { name: /^Insert a new step between / });
      expect(await inserts.count()).toBeGreaterThan(0);
      for (const insert of await inserts.all()) {
        await expect(insert).toBeVisible();
        await expect(insert).toHaveCSS('opacity', '1');
      }
      const insert = page.getByRole('button', { name: INSERT_NAME, exact: true });
      const box = await boxOf(insert);
      expect(box.width).toBeGreaterThan(8);
      if (shared) {
        await expect(insert).toHaveAttribute('data-resting-visibility', 'visible');
        // Hover emphasis changes color only, never geometry, so the target does not move under the pointer.
        const restColor = await insert.evaluate((element) => getComputedStyle(element).color);
        await insert.hover();
        await expect.poll(() => insert.evaluate((element) => getComputedStyle(element).color)).not.toBe(restColor);
        expect(await boxOf(insert)).toEqual(box);
      } else {
        await expect(insert).not.toHaveAttribute('data-resting-visibility');
      }
    });

    test('keeps the keyboard insertion path: Tab, Enter or Space opens the menu, Escape returns to the canvas', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const insert = page.getByRole('button', { name: INSERT_NAME, exact: true });
      const addAction = page.getByRole('menuitem', { name: 'Add an action', exact: true });
      await tabTo(page, insert);
      await expect(insert).toHaveCSS('opacity', '1');
      await page.keyboard.press('Enter');
      await expect(addAction).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Add a parallel branch', exact: true })).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(addAction).not.toBeVisible();
      if (!shared) {
        await expect(page.locator('#msla-node-Init_all')).toBeFocused();
        await page.keyboard.press('Tab');
      }
      await expect(insert).toBeFocused();
      await page.keyboard.press('Space');
      await expect(addAction).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(addAction).not.toBeVisible();
      if (shared) {
        await expect(insert).toBeFocused();
      }
    });

    test('pastes a copied action through the edge insert with unchanged workflow semantics', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.locator('#msla-node-Compose').click({ button: 'right' });
      await page.getByTestId('msla-copy-menu-option').click();
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: INSERT_NAME, exact: true }).click();
      await page.getByTestId('msla-paste-button-init_all-compose').click();
      await expect(page.locator('#msla-node-Compose-copy')).toBeVisible();
      const after = await getSerializedWorkflowFromStateV2(page);
      expect(after.definition.actions['Compose-copy'].inputs).toEqual(before.definition.actions.Compose.inputs);
      expect(after.definition.actions['Compose-copy'].runAfter).toEqual(before.definition.actions.Compose.runAfter);
      expect(after.definition.actions.Compose.runAfter).toEqual({ 'Compose-copy': ['SUCCEEDED'] });
    });

    test('renders no insert controls when read-only', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      await setContextSetting(page, 'Read Only', true);
      await expect(page.locator('#msla-node-Compose')).toBeVisible();
      await expect(page.getByRole('button', { name: /^Insert a new step/ })).toHaveCount(0);
    });

    test('draws a visible arrowhead at the target end of every edge', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const pathSelector = shared ? '.msla-shared-edge-path' : '.react-flow__edge-path';
      // Straight vertical paths have a zero-width box, so wait for attachment rather than visibility.
      await expect(page.locator(pathSelector).first()).toBeAttached();
      // Resolve each edge's marker-end to the drawn cap and read the paint the browser actually applies,
      // so a transparent stroke or a faded cap fails even though the marker element exists.
      const caps = await page.locator(pathSelector).evaluateAll((paths) =>
        paths.map((path) => {
          const id = /^url\(["']?#([^"')]+)["']?\)$/u.exec(path.getAttribute('marker-end') ?? '')?.[1];
          const cap = id ? document.getElementById(id)?.querySelector('path') : null;
          if (!cap) {
            return null;
          }
          const style = getComputedStyle(cap);
          const paint = style.fill !== 'none' && !style.fill.endsWith(', 0)') ? style.fill : style.stroke;
          return {
            painted: paint !== 'none' && paint !== 'transparent' && !paint.endsWith(', 0)'),
            opacity: Number(style.opacity) * Number(style.strokeOpacity),
            sharedCap: cap.classList.contains('msla-shared-edge-cap'),
          };
        })
      );
      expect(caps.length).toBeGreaterThan(0);
      for (const cap of caps) {
        expect(cap).not.toBeNull();
        expect(cap!.painted).toBe(true);
        expect(cap!.opacity).toBeGreaterThan(0.5);
        expect(cap!.sharedCap).toBe(shared);
      }
      if (shared) {
        // The tip must stop short of the input dot so direction reads separately from the port.
        const gaps = await page.locator(pathSelector).evaluateAll((paths) => {
          const dots = Array.from(document.querySelectorAll('.react-flow__handle.target span[data-handle]'), (dot) =>
            dot.getBoundingClientRect()
          ).filter((rect) => rect.width > 0);
          // Fit view scales the canvas, so convert screen distances back to flow units.
          const viewport = document.querySelector('.react-flow__viewport');
          const zoom = viewport ? new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a : 1;
          return paths.map((path) => {
            const svgPath = path as SVGPathElement;
            const end = svgPath.getPointAtLength(svgPath.getTotalLength());
            const tip = new DOMPoint(end.x, end.y).matrixTransform(svgPath.getScreenCTM()!);
            return (
              Math.min(
                ...dots.map((rect) =>
                  Math.hypot(Math.max(rect.left - tip.x, 0, tip.x - rect.right), Math.max(rect.top - tip.y, 0, tip.y - rect.bottom))
                )
              ) / zoom
            );
          });
        });
        expect(gaps.length).toBeGreaterThan(0);
        for (const gap of gaps) {
          expect(gap).toBeGreaterThanOrEqual(2.5);
        }
      }
    });

    test('keeps the insert tooltip off the upstream node', async ({ page }) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const insert = page.getByRole('button', { name: INSERT_NAME, exact: true });
      await insert.hover();
      const tooltip = page.getByRole('tooltip').filter({ hasText: INSERT_NAME });
      await expect(tooltip).toBeVisible();
      expect(overlaps(await boxOf(tooltip), await boxOf(page.locator('#msla-node-Init_all')))).toBe(false);
      expect(overlaps(await boxOf(tooltip), await boxOf(insert))).toBe(false);
    });

    test('keeps the full authored title accessible after renaming an action', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const card = page.locator('#msla-node-Compose');
      const longTitle = 'Validate every line item before authorizing payment to the vendor';
      await card.press('Enter');
      const titleEditor = page.getByRole('textbox', { name: 'Card title', exact: true });
      await titleEditor.fill(longTitle);
      await titleEditor.press('Tab');
      await expect(card).toHaveAccessibleName(new RegExp(longTitle));
      if (shared) {
        const title = card.getByText(longTitle, { exact: true });
        await expect(title).toHaveCSS('-webkit-line-clamp', '3');
        expect(await card.evaluate((element) => element.offsetHeight)).toBe(68);
        await page.locator('#msla-panel-header-close-nav').click();
        await tabTo(page, card);
        const heading = page.getByRole('heading', { name: longTitle, exact: true });
        await expect(heading).toBeVisible();
        await expect(heading).toHaveCSS('white-space', 'normal');
        expect(await heading.evaluate(({ scrollHeight, clientHeight }) => scrollHeight - clientHeight)).toBe(0);
        await testInfo.attach('keyboard-full-title', { body: await page.screenshot(), contentType: 'image/png' });
        await page.keyboard.press('Escape');
        await expect(heading).not.toBeVisible();
      } else {
        await expect(card).not.toHaveAttribute('data-node-card');
      }
    });
  });
}

test.describe('Shared redesign direction and hover affordances', { tag: ['@mock', '@shared-node-ui'] }, () => {
  test('opens the node hover card beside the node instead of over the upstream card', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    const compose = page.locator('#msla-node-Compose');
    await compose.hover();
    const info = page
      .locator('[data-node-info-card="action"]')
      .filter({ has: page.getByRole('heading', { name: 'Compose', exact: true }) });
    await expect(info).toBeVisible();
    const card = await boxOf(info);
    expect(overlaps(card, await boxOf(page.locator('#msla-node-Init_all')))).toBe(false);
    expect(overlaps(card, await boxOf(compose))).toBe(false);
  });

  test('keeps a parallel card uncovered and lets the pointer enter the hover card', async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'General Run After');
    const compose = page.locator('#msla-node-Compose');
    const navigation = page.locator('#msla-node-Execute_a_navigation_plan');
    const [composeBox, navigationBox] = await Promise.all([boxOf(compose), boxOf(navigation)]);
    const [anchor, sibling] = composeBox.x < navigationBox.x ? [compose, navigation] : [navigation, compose];
    await anchor.hover();
    const info = page.locator('[data-node-info-card="action"]');
    await expect(info).toBeVisible();
    const [anchorBox, siblingBox] = await Promise.all([boxOf(anchor), boxOf(sibling)]);
    await expect.poll(async () => overlaps(await boxOf(info), siblingBox) || overlaps(await boxOf(info), anchorBox)).toBe(false);
    await testInfo.attach('parallel-hover-placement', { body: await page.screenshot(), contentType: 'image/png' });
    await info.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(info).not.toBeVisible();
    await sibling.hover();
    await expect(info).toBeVisible();
  });

  test('gives editable source ports visible hover feedback without moving them', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    const port = page.locator('.react-flow__node[data-id="Init_all"] .react-flow__handle.source[data-port-interactive="true"]');
    await expect(port).toHaveCount(1);
    const dot = port.locator('> *').first();
    const readFill = () => dot.evaluate((element) => getComputedStyle(element).backgroundColor);
    const rest = await readFill();
    const box = await boxOf(port);
    await port.hover();
    await expect.poll(readFill).not.toBe(rest);
    expect(await boxOf(port)).toEqual(box);
    await expect(port).toHaveCSS('cursor', 'crosshair');
  });

  test('hides source port feedback when read-only', async ({ page }) => {
    await openSharedWorkflow(page, 'General Run After');
    await setContextSetting(page, 'Read Only', true);
    await expect(page.locator('[data-port-interactive="true"]')).toHaveCount(0);
  });
});
