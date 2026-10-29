import { expect, test } from '@playwright/test';
import type { AppStore } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { openSharedWorkflow, setContextSetting, setSharedNodeUi, waitForViewport } from './utils/sharedNodeUi';

type DesignerWindow = Window & { DesignerStoreV2: Pick<AppStore, 'dispatch' | 'getState'> };
interface LayoutFrame {
  timestamp: number;
  present: boolean;
  shared: boolean | null;
  cardWidth: number | null;
  layoutWidth: number | null;
  cardBounds: { x: number; y: number; width: number; height: number } | null;
  nodeBounds: { x: number; y: number; width: number; height: number } | null;
  visible: boolean;
  hiddenAncestors: string[];
  cardVisibility: string | null;
  nodeVisibility: string | null;
  cardOwnVisibility: string | null;
  nodeOwnVisibility: string | null;
  hiddenVisibilityAncestors: string[];
  nativeMeasurementId: number | null;
  nodeStyle: string | null;
}
interface NativeMeasurement {
  id: number;
  requestedAt: number;
  settledAt: number | null;
}
type LayoutAuditWindow = Window & {
  sharedLayoutAudit?: {
    frame: number;
    samples: LayoutFrame[];
    nativeMeasurements: NativeMeasurement[];
    activeNativeMeasurementId: number | null;
  };
};

for (const flag of ['true', 'false', 'omitted'] as const) {
  test.describe(`Local viewport and structural boundaries, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    for (const transition of ['renderer', 'viewport-only', 'host-layout'] as const) {
      test(`audits one stable leaf on every frame throughout ${transition} transitions`, async ({ page }, testInfo) => {
        await openSharedWorkflow(page, 'Switch', flag);
        const before = await getSerializedWorkflowFromStateV2(page);
        expect(JSON.stringify(before)).not.toContain('dimensionsObserved');
        await page.evaluate(() => {
          const samples: LayoutFrame[] = [];
          const state = {
            frame: 0,
            samples,
            nativeMeasurements: [] as NativeMeasurement[],
            activeNativeMeasurementId: null as number | null,
          };
          const sample = () => {
            const card = document.getElementById('msla-node-Action-1-Compose');
            const node = card?.closest<HTMLElement>('.react-flow__node');
            const bounds = (element: HTMLElement | null | undefined) => {
              if (!element) {
                return null;
              }
              const { x, y, width, height } = element.getBoundingClientRect();
              return { x, y, width, height };
            };
            const hiddenAncestors = [];
            const hiddenVisibilityAncestors = [];
            for (let ancestor = card; ancestor; ancestor = ancestor.parentElement) {
              const style = getComputedStyle(ancestor);
              if (style.display === 'none' || style.contentVisibility === 'hidden' || Number.parseFloat(style.opacity) <= 0) {
                hiddenAncestors.push(
                  `${ancestor.tagName}:${ancestor.getAttribute('data-id') ?? ancestor.id}:display=${style.display};contentVisibility=${style.contentVisibility};opacity=${style.opacity}`
                );
              }
              if (node && !node.contains(ancestor) && style.visibility !== 'visible') {
                hiddenVisibilityAncestors.push(`${ancestor.tagName}:${ancestor.id}:visibility=${style.visibility}`);
              }
            }
            const timestamp = performance.now();
            const shared = card ? card.hasAttribute('data-node-card') : null;
            const visible = card?.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true }) ?? false;
            const nativeMeasurementId = state.activeNativeMeasurementId;
            if (nativeMeasurementId !== null && shared === false && visible) {
              state.nativeMeasurements[nativeMeasurementId].settledAt = timestamp;
              state.activeNativeMeasurementId = null;
            }
            samples.push({
              timestamp,
              present: !!card && !!node,
              shared,
              cardWidth: card?.offsetWidth ?? null,
              layoutWidth: node?.clientWidth ?? null,
              cardBounds: bounds(card),
              nodeBounds: bounds(node),
              visible,
              hiddenAncestors,
              cardVisibility: card ? getComputedStyle(card).visibility : null,
              nodeVisibility: node ? getComputedStyle(node).visibility : null,
              cardOwnVisibility: card?.style.visibility ?? null,
              nodeOwnVisibility: node?.style.visibility ?? null,
              hiddenVisibilityAncestors,
              nativeMeasurementId,
              nodeStyle: node?.getAttribute('style') ?? null,
            });
            state.frame = requestAnimationFrame(sample);
          };
          (window as LayoutAuditWindow).sharedLayoutAudit = state;
          sample();
        });
        let samples: LayoutFrame[] = [];
        let nativeMeasurements: NativeMeasurement[] = [];
        try {
          const modes = transition === 'renderer' ? [true, false, true, false] : Array<boolean>(4).fill(flag === 'true');
          for (const [index, enabled] of modes.entries()) {
            if (transition === 'renderer') {
              if (!enabled) {
                await page.evaluate(() => {
                  const audit = (window as LayoutAuditWindow).sharedLayoutAudit!;
                  const measurement = { id: audit.nativeMeasurements.length, requestedAt: performance.now(), settledAt: null };
                  audit.nativeMeasurements.push(measurement);
                  audit.activeNativeMeasurementId = measurement.id;
                });
              }
              await setSharedNodeUi(page, enabled);
            }
            if (transition === 'host-layout') {
              await setContextSetting(page, 'Read Only', index % 2 === 0);
            }
            const card = page.locator('#msla-node-Action-1-Compose');
            if (enabled) {
              await expect(card).toHaveAttribute('data-node-card', 'action');
            } else {
              await expect(card).not.toHaveAttribute('data-node-card', 'action');
              await expect(card).toBeVisible();
              if (transition === 'renderer') {
                await expect
                  .poll(() =>
                    page.evaluate(() => (window as LayoutAuditWindow).sharedLayoutAudit!.nativeMeasurements.at(-1)?.settledAt ?? null)
                  )
                  .not.toBeNull();
              }
            }
            await page.setViewportSize({ width: index % 2 === 0 ? 1000 : 1280, height: 720 });
            await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
            await waitForViewport(page);
          }
        } finally {
          const audit = await page.evaluate(() => {
            const owner = window as LayoutAuditWindow;
            const state = owner.sharedLayoutAudit;
            if (!state) {
              throw new Error('The leaf frame audit must retain its owned sampler state until cleanup.');
            }
            cancelAnimationFrame(state.frame);
            delete owner.sharedLayoutAudit;
            return { samples: state.samples, nativeMeasurements: state.nativeMeasurements };
          });
          samples = audit.samples;
          nativeMeasurements = audit.nativeMeasurements;
          await testInfo.attach('transient-layout-frame-samples', {
            body: JSON.stringify({
              samples,
              transition,
              initialFlag: flag,
              nativeMeasurements,
              limit:
                'Every RAF sample for one real leaf is retained. Cold native renderer returns include bounded intrinsic measurement; no painted/no-flash continuity claim or all-family/path audit.',
            }),
            contentType: 'application/json',
          });
        }
        expect(samples.length).toBeGreaterThan(4);
        expect(
          samples.every((sample) => sample.present && sample.hiddenAncestors.length === 0 && sample.hiddenVisibilityAncestors.length === 0)
        ).toBe(true);
        expect
          .soft(
            samples.every((sample) => {
              if (sample.visible) {
                return true;
              }
              const measurement = nativeMeasurements.find(({ id }) => id === sample.nativeMeasurementId);
              return (
                transition === 'renderer' &&
                sample.shared === false &&
                sample.nodeOwnVisibility === 'hidden' &&
                sample.nodeVisibility === 'hidden' &&
                sample.cardOwnVisibility !== 'hidden' &&
                sample.cardVisibility === 'hidden' &&
                measurement !== undefined &&
                measurement.settledAt !== null &&
                sample.timestamp >= measurement.requestedAt &&
                sample.timestamp <= measurement.settledAt
              );
            })
          )
          .toBe(true);
        expect(
          samples.every((sample) =>
            [sample.cardBounds, sample.nodeBounds].every(
              (bounds) => bounds && Object.values(bounds).every(Number.isFinite) && bounds.width > 0 && bounds.height > 0
            )
          )
        ).toBe(true);
        expect(samples.every((sample) => Number.isFinite(sample.cardWidth) && Number.isFinite(sample.layoutWidth))).toBe(true);
        expect(samples.every((sample) => sample.cardWidth! > 0 && sample.layoutWidth! > 0)).toBe(true);
        if (transition === 'renderer') {
          expect(nativeMeasurements).toHaveLength(2);
          expect(nativeMeasurements.every(({ requestedAt, settledAt }) => settledAt !== null && settledAt >= requestedAt)).toBe(true);
          expect(samples.some((sample) => sample.shared)).toBe(true);
          expect(samples.some((sample) => sample.shared === false)).toBe(true);
        } else {
          expect(samples.every((sample) => sample.shared === (flag === 'true'))).toBe(true);
        }
        expect(samples.filter((sample) => sample.shared).every((sample) => Math.abs(sample.cardWidth! - sample.layoutWidth!) <= 1)).toBe(
          true
        );
        expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
        expect(JSON.stringify(await getSerializedWorkflowFromStateV2(page))).not.toContain('dimensionsObserved');
      });
    }

    test('resizes and fits the real canvas and audits actual clamp versus deterministic unclamped host state', async ({
      page,
    }, testInfo) => {
      await openSharedWorkflow(page, 'General Run After', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      await page.setViewportSize({ width: 900, height: 700 });
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      const viewport = page.locator('.react-flow__viewport');
      const fitted = await viewport.getAttribute('style');
      expect(fitted).not.toMatch(/NaN|Infinity/);
      const pane = page.locator('.react-flow__pane');
      const bounds = await pane.boundingBox();
      if (!bounds) {
        throw new Error('The resized actual pane must have visible bounds.');
      }
      expect(bounds.width).toBeGreaterThan(0);
      expect(bounds.width).toBeLessThanOrEqual(900);
      await page.mouse.move(bounds.x + 40, bounds.y + 80);
      await page.mouse.wheel(30_000, 30_000);
      await waitForViewport(page);
      const clamped = await viewport.getAttribute('style');
      await page.mouse.wheel(30_000, 30_000);
      await waitForViewport(page);
      await expect(viewport).toHaveAttribute('style', clamped!);
      await page.evaluate(() => {
        const store = (window as DesignerWindow).DesignerStoreV2;
        if (!store.getState().designerView.clampPan) {
          throw new Error('The actual initial Local host must have pan clamping enabled.');
        }
        store.dispatch({ type: 'designerView/toggleClampPan' });
      });
      await page.mouse.wheel(30_000, 30_000);
      await waitForViewport(page);
      await expect(viewport).not.toHaveAttribute('style', clamped!);
      await page.evaluate(() => (window as DesignerWindow).DesignerStoreV2.dispatch({ type: 'designerView/toggleClampPan' }));
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      await testInfo.attach('viewport-clamp-boundary', {
        body: JSON.stringify({
          fitted,
          clamped,
          limit: 'Actual wheel/resize; unclamped comparison uses source-contract reducer, no new UI',
        }),
        contentType: 'application/json',
      });
    });

    test('retains actual hidden graph roles without rendering operation cards or paths for hidden edges', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const hidden = page.locator('.react-flow__node-HIDDEN_NODE');
      expect(await hidden.count()).toBeGreaterThan(0);
      await expect(hidden.locator('[data-node-card], [id^="msla-node-"]')).toHaveCount(0);
      expect(await hidden.locator('.react-flow__handle').count()).toBeGreaterThan(0);
      await expect(page.locator('.react-flow__edge-HIDDEN_EDGE path')).toHaveCount(0);
      await testInfo.attach('mounted-hidden-roles', {
        body: JSON.stringify({
          hiddenIds: await hidden.evaluateAll((elements) => elements.map((element) => element.getAttribute('data-id'))),
          limit: 'Actual mounted hidden-node handles and no hidden-edge paths, not all virtualized graph instances',
        }),
        contentType: 'application/json',
      });
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    });

    test('settles real Switch case geometry after add and delete without losing existing branches', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Switch', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const card = page.locator('#msla-node-Switch');
      const ports = card.locator('.react-flow__handle.source');
      const initialPorts = await ports.count();
      const initialWidth = await page.locator('.react-flow__node[data-id="Switch"]').evaluate((element) => element.clientWidth);
      await page.getByRole('button', { name: 'Add case', exact: true }).click();
      await expect
        .poll(async () => Object.keys((await getSerializedWorkflowFromStateV2(page)).definition.actions.Switch.cases).length)
        .toBe(Object.keys(before.definition.actions.Switch.cases).length + 1);
      if (flag === 'true') {
        await expect(ports).toHaveCount(initialPorts + 1);
      } else {
        await expect(ports).toHaveCount(0);
      }
      const added = await getSerializedWorkflowFromStateV2(page);
      const id = Object.keys(added.definition.actions.Switch.cases).find((id) => !before.definition.actions.Switch.cases[id]);
      if (!id) {
        throw new Error('The real Add case command must create a new case.');
      }
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      expect(
        await page.locator('.react-flow__handle.source').evaluateAll((elements) =>
          elements.every((element) => {
            const rect = element.getBoundingClientRect();
            return Number.isFinite(rect.x) && Number.isFinite(rect.y) && rect.width > 0 && rect.height > 0;
          })
        )
      ).toBe(true);
      expect(await page.locator('.react-flow__node[data-id="Switch"]').evaluate((element) => element.clientWidth)).toBeGreaterThan(
        initialWidth
      );
      await page.locator(`[id="msla-node-${id}"]`).click({ button: 'right' });
      await page.getByRole('menuitem', { name: /^Delete\b/ }).click();
      await page.getByRole('dialog').getByRole('button', { name: 'Delete', exact: true }).click();
      await expect(ports).toHaveCount(initialPorts);
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await testInfo.attach('dynamic-switch-geometry', {
        body: JSON.stringify({
          initialPorts,
          initialWidth,
          limit: 'Settled real mutation geometry; not every intermediate animation frame',
        }),
        contentType: 'application/json',
      });
    });
  });
}
