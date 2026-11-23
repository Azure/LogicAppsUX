import { expect, test, type Page } from '@playwright/test';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, setContextSetting, setSharedNodeUi, waitForViewport } from './utils/sharedNodeUi';

const readPaint = (page: Page) =>
  page.evaluate(() => {
    const root = document.querySelector<HTMLElement>('.msla-designer-canvas')!;
    const flow = root.querySelector<HTMLElement>('.react-flow')!;
    const background = flow.querySelector<SVGElement>('.react-flow__background')!;
    const card = document.getElementById('msla-node-Compose')!;
    const surface = card.hasAttribute('data-node-card') ? card.querySelector(':scope > div')! : card;
    const probe = document.createElement('span');
    // Resolve the shared canvas role exactly as designer-ui-v2 tokens do (scope value, else Background1).
    probe.style.backgroundColor = 'var(--designer-ui-v2-canvas-background, var(--colorNeutralBackground1))';
    root.appendChild(probe);
    const background1 = getComputedStyle(probe).backgroundColor;
    // Independent reference: Fluent Background1 without the shared canvas variable.
    probe.style.backgroundColor = 'var(--colorNeutralBackground1)';
    const fluentBackground1 = getComputedStyle(probe).backgroundColor;
    probe.remove();
    const flowColor = getComputedStyle(flow).backgroundColor;
    const backgroundColor = getComputedStyle(background).backgroundColor;
    return {
      background1,
      fluentBackground1,
      root: getComputedStyle(root).backgroundColor,
      flow: flowColor,
      background: backgroundColor,
      backgroundOverFlow: backgroundColor === 'rgba(0, 0, 0, 0)' ? flowColor : backgroundColor,
      flowClass: flow.className,
      backgroundVariable: getComputedStyle(flow).getPropertyValue('--xy-background-color'),
      card: {
        fill: getComputedStyle(surface).backgroundColor,
        border: getComputedStyle(surface).border,
        shadow: getComputedStyle(surface).boxShadow,
      },
      pattern: background.querySelector('circle')?.outerHTML,
    };
  });

for (const dark of [false, true]) {
  for (const flag of ['true', 'false', 'omitted'] as const) {
    test(
      `records actual main canvas paint, ${dark ? 'dark' : 'light'}, flag ${flag}`,
      {
        tag: ['@mock', '@shared-node-ui'],
      },
      async ({ page }, testInfo) => {
        await openSharedWorkflow(page, 'General Run After', flag);
        if (dark) {
          await setContextSetting(page, 'Dark Mode', true);
        }
        // Changing layout can move Compose under a stationary mouse; don't compare its rest paint to its hover paint.
        await page.mouse.move(0, 0);
        const compose = page.locator('#msla-node-Compose');
        await expect(compose.and(page.locator(':hover'))).toHaveCount(0);
        const before = await getSerializedWorkflowFromStateV2(page);
        let previous = '';
        await expect
          .poll(
            async () => {
              const current = JSON.stringify(await readPaint(page));
              const settled = current === previous;
              previous = current;
              return settled;
            },
            { intervals: [200] }
          )
          .toBe(true);
        const paint = await readPaint(page);
        await testInfo.attach('settled-main-canvas-paint', {
          body: JSON.stringify({ flag, dark, paint }),
          contentType: 'application/json',
        });
        const screenshot = testInfo.outputPath('main-canvas-fit.png');
        await page.screenshot({ path: screenshot, animations: 'disabled' });
        await testInfo.attach('settled-main-canvas-fit', { path: screenshot, contentType: 'image/png' });
        expect(paint.flowClass.split(' ')).toContain(dark ? 'dark' : 'light');
        if (flag === 'true') {
          // Pin the resolved role to its contract rather than to the variable under test:
          // light scope paints #fafafa, dark scope falls back to Fluent Background1.
          expect(paint.background1).toBe(dark ? paint.fluentBackground1 : 'rgb(250, 250, 250)');
          expect(paint.flow).toBe(paint.background1);
          expect(paint.backgroundOverFlow).toBe(paint.background1);
        } else {
          await setSharedNodeUi(page, true);
          await expect(compose).toHaveAttribute('data-node-card', 'action');
          await setSharedNodeUi(page, false);
          await expect(compose).not.toHaveAttribute('data-node-card', 'action');
          await waitForViewport(page);
          await expect(compose.and(page.locator(':hover'))).toHaveCount(0);
          await expect.poll(async () => ({ ...(await readPaint(page)), pattern: undefined })).toEqual({ ...paint, pattern: undefined });
        }
        expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      }
    );
  }
}
