import { expect, type Locator, type Page, test } from '@playwright/test';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow, setContextSetting, waitForViewport } from './utils/sharedNodeUi';

const card = (page: Page, id: string) => page.locator(`[id="msla-node-${id}"]`);
const zoom = (page: Page) =>
  page.locator('.react-flow__viewport').evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11);

async function contrast(foreground: Locator, background: Locator, property = 'color') {
  const color = await foreground.evaluate((element, prop) => getComputedStyle(element).getPropertyValue(prop), property);
  const surface = await background.evaluate((element) => getComputedStyle(element).backgroundColor);
  function luminance(rgb: string) {
    expect(rgb).toMatch(/^rgb\(\d+, \d+, \d+\)$/);
    const [r, g, b] = rgb.match(/\d+/g)!.map((component) => {
      const value = Number(component) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  const values = [luminance(color), luminance(surface)].sort((a, b) => b - a);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

for (const flag of ['false', 'true'] as const) {
  test.describe(`Node overview and convergence, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    const shared = flag === 'true';

    test('keeps a three-line authoring title inside its layout bounds at overview zoom', async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await openSharedWorkflow(page, 'General Run After', flag);
      const action = card(page, 'Init_all');
      const label = 'Send an email notification to the on-call engineer after the nightly import';
      await action.press('Enter');
      const titleInput = page.getByRole('textbox', { name: 'Card title', exact: true });
      await titleInput.fill(label);
      await titleInput.press('Tab');
      await expect(action).toHaveAccessibleName(new RegExp(label));
      await page.getByTestId('msla-panel-header-close-nav').click();

      const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
      const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
      for (let step = 0; step < 10 && (await zoom(page)) <= 0.5; step++) {
        await zoomIn.click();
        await waitForViewport(page);
      }
      expect(await zoom(page)).toBeGreaterThan(0.5);
      const bounds = () =>
        action.evaluate((element) => ({
          card: element.offsetHeight,
          reserved: element.closest<HTMLElement>('.react-flow__node')!.style.height,
          title: element.querySelector<HTMLElement>('[data-node-title]')?.offsetHeight,
        }));
      const detailBounds = await bounds();
      if (shared) {
        expect(detailBounds).toEqual({ card: 68, reserved: '68px', title: 54 });
      }
      for (let step = 0; step < 10 && (await zoom(page)) >= 0.5; step++) {
        await zoomOut.click();
        await waitForViewport(page);
      }
      expect(await zoom(page)).toBeLessThan(0.5);
      await expect(page.locator('[data-node-overview]')).toHaveCount(shared ? 1 : 0);
      if (shared) {
        await expect(action.locator('[data-node-title]')).toHaveCSS('font-size', '16px');
      }
      expect(await bounds()).toEqual(detailBounds);
    });

    test('keeps run status visible at native fit and returns to detail without resizing the card', async ({ page }) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await openSharedWorkflow(page, 'Monitoring view conditional', flag);
      await LoadRunFile(page, 'mixedStatus');
      const delay = card(page, 'Delay');
      const status = shared ? delay.getByText('Failed', { exact: true }) : delay.getByAltText('Failed', { exact: true });
      await expect(status).toBeVisible();
      await page.getByRole('button', { name: 'Zoom view to fit' }).click();
      await waitForViewport(page);
      expect(await zoom(page)).toBeGreaterThanOrEqual(0.36);
      expect(await zoom(page)).toBeLessThan(0.5);
      const size = () => delay.evaluate((element) => [element.offsetWidth, element.offsetHeight]);
      const fittedSize = await size();
      const title = delay.locator('[data-node-title]');
      if (shared) {
        await expect(page.locator('[data-node-overview]')).toHaveCount(1);
        await expect(title).toHaveCSS('font-size', '16px');
        await expect(delay.locator('[data-node-glyph]')).toHaveCSS('transform', 'matrix(1.2, 0, 0, 1.2, 0, 0)');
      } else {
        await expect(page.locator('[data-node-overview]')).toHaveCount(0);
      }
      const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
      await zoomIn.click();
      await zoomIn.click();
      await expect.poll(() => zoom(page)).toBeGreaterThan(0.5);
      await expect(page.locator('[data-node-overview]')).toHaveCount(0);
      if (shared) {
        await expect(page.locator('[data-node-card] [data-node-title]').first()).toHaveCSS('font-size', '14px');
      }
      await page.getByRole('button', { name: 'Zoom view to fit' }).click();
      await waitForViewport(page);
      expect(await size()).toEqual(fittedSize);
    });

    test('hovering the Switch join targets only its downstream insert without opening it', async ({ page }) => {
      await openSharedWorkflow(page, 'Switch', flag);
      const insert = page.getByRole('button', { name: /insert a new step between Switch and Initialize owner/i });
      if (!shared) {
        await expect(page.locator('[data-merge-add-source]')).toHaveCount(0);
        await expect(insert).toBeVisible();
        return;
      }
      const control = page.locator('[data-edge-control]').filter({ has: insert });
      await expect(control).toHaveAttribute('data-revealed', 'false');
      await page.getByRole('img', { name: 'Merge point for Switch', exact: true }).hover();
      await expect(control).toHaveAttribute('data-active-from-merge', 'true');
      await expect(page.locator('[data-active-from-merge]')).toHaveCount(1);
      await expect(page.getByRole('menu')).toHaveCount(0);
      await page.mouse.move(1, 1);
      await expect(control).toHaveAttribute('data-revealed', 'false');
    });

    for (const theme of ['light', 'dark'] as const) {
      test(`${theme} failure keeps text and status legible, with distinct forced-color selection`, async ({ page }) => {
        await openSharedWorkflow(page, 'Monitoring view conditional', flag);
        if (theme === 'dark') {
          await setContextSetting(page, 'Dark Mode', true);
        }
        await LoadRunFile(page, 'mixedStatus');
        const delay = card(page, 'Delay');
        const status = shared ? delay.getByText('Failed', { exact: true }) : delay.getByAltText('Failed', { exact: true });
        await expect(status).toBeVisible();
        const perimeter = delay.locator('[data-node-status-perimeter]');
        const surface = delay.locator('[data-node-surface]');
        if (shared) {
          expect(await contrast(status, surface)).toBeGreaterThanOrEqual(4.5);
          expect(await contrast(perimeter, surface, 'border-top-color')).toBeGreaterThanOrEqual(3);
        }
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        await expect(status).toBeVisible();
        await delay.click();
        if (shared) {
          await expect(delay).toHaveAttribute('data-selected', 'true');
          await expect(perimeter).toHaveCSS('border-top-style', 'dashed');
          await expect(surface).toHaveCSS('border-top-style', 'solid');
          expect(await contrast(status, surface)).toBeGreaterThanOrEqual(4.5);
          expect(await contrast(perimeter, surface, 'border-top-color')).toBeGreaterThanOrEqual(3);
          await page.keyboard.press('Tab');
          await delay.focus();
          await expect(delay).toHaveCSS('outline-offset', '2px');
        } else {
          await expect(perimeter).toHaveCount(0);
        }
      });
    }
  });
}
