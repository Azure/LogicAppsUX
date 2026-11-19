import { expect, type Page, type TestInfo, test } from '@playwright/test';
import agentWorkflow from '../../__mocks__/workflows/Agent.json' with { type: 'json' };
import allScopeNodes from '../../__mocks__/workflows/AllScopeNodes.json' with { type: 'json' };
import switchWorkflow from '../../__mocks__/workflows/Switch.json' with { type: 'json' };
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow, waitForViewport } from './utils/sharedNodeUi';

type Flag = 'true' | 'false';
type Box = { x: number; y: number; width: number; height: number };

// Counts are derived from the fixtures so a fixture edit cannot silently turn these into constant checks.
// Switch counts explicit cases only; the default branch is always present and not counted (same as legacy text).
const switchCaseCount = (definition: { actions: { Switch: { cases: Record<string, unknown> } } }) =>
  Object.keys(definition.actions.Switch.cases).length;
const allScopeSwitchCases = switchCaseCount(allScopeNodes.definition);
const switchFixtureCases = switchCaseCount(switchWorkflow.definition);
const agentTools = agentWorkflow.definition.actions.WorkflowAgent.tools;
const multiActionTool = Object.entries(agentTools).find(([, tool]) => Object.keys(tool.actions).length > 1);

const card = (page: Page, id: string) => page.locator(`.react-flow__node[data-id="${id}"]`);
const box = async (page: Page, id: string): Promise<Box> => {
  const value = await card(page, id).boundingBox();
  if (!value) {
    throw new Error(`${id} must be mounted and visible.`);
  }
  return value;
};
const centreX = (value: Box) => value.x + value.width / 2;
const centreY = (value: Box) => value.y + value.height / 2;
const countText = (count: number, one: string, many: string) => new RegExp(`^${count} ${count === 1 ? one : many}$`);

async function attachCanvas(page: Page, testInfo: TestInfo, name: string) {
  await testInfo.attach(name, { body: await page.screenshot({ animations: 'disabled' }), contentType: 'image/png' });
}

// Uses each presentation's real header chevron: the shared card button, or the legacy CollapseToggle (id attribute).
async function toggleGraph(page: Page, cardId: string, flag: Flag) {
  const toggle =
    flag === 'true'
      ? card(page, cardId)
          .getByRole('button', { name: /^(Collapse|Expand)$/ })
          .first()
      : card(page, cardId).locator('[id$="-collapse-toggle"]').first();
  await toggle.click();
  await waitForViewport(page);
}

for (const flag of ['true', 'false'] as const) {
  test.describe(`Standard node redesign, flag ${flag}`, { tag: ['@mock', '@shared-node-ui'] }, () => {
    test('captures the conditional monitoring run at fit and measures its canvas zoom', async ({ page }, testInfo) => {
      await page.setViewportSize({ width: 1600, height: 1000 });
      await openSharedWorkflow(page, 'Monitoring view conditional', flag);
      await LoadRunFile(page, 'normalState');
      const delay = card(page, 'Delay');
      await expect(
        flag === 'true'
          ? delay.locator('[data-node-subtitle-kind="status"]').getByText('Succeeded', { exact: true })
          : delay.getByAltText('Succeeded', { exact: true })
      ).toBeVisible();
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await waitForViewport(page);
      const zoom = await page
        .locator('.react-flow__viewport')
        .evaluate((element) => new DOMMatrixReadOnly(getComputedStyle(element).transform).m11);
      await attachCanvas(page, testInfo, `monitoring-normal-fit-flag-${flag}`);
      await testInfo.attach('monitoring-fit-zoom', { body: String(zoom), contentType: 'text/plain' });
      if (flag === 'true') {
        expect(zoom, 'fit zoom of the 26-action conditional monitoring run').toBeGreaterThanOrEqual(0.36);
      }
    });

    test('nested containers depth 2-4 keep independent local vertical axes', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      // Switch (1) -> ForEach_Case (2) -> ForEach (3) -> ForEach_nested (4) -> leaf actions.
      const graphs = await Promise.all(['Switch', 'ForEach_Case', 'ForEach', 'ForEach_nested'].map((id) => box(page, id)));
      for (let depth = 1; depth < graphs.length; depth++) {
        const [outer, inner] = [graphs[depth - 1], graphs[depth]];
        // Every nested graph is fully contained by its parent graph.
        expect(inner.x).toBeGreaterThanOrEqual(outer.x - 1);
        expect(inner.x + inner.width).toBeLessThanOrEqual(outer.x + outer.width + 1);
        expect(inner.y).toBeGreaterThanOrEqual(outer.y - 1);
      }
      const [leafA, leafB] = await Promise.all(['ForEach_Action_2', 'ForEach_Action_3'].map((id) => box(page, id)));
      expect(Math.abs(centreX(leafA) - centreX(leafB))).toBeLessThanOrEqual(1);
      expect(leafB.y).toBeGreaterThan(leafA.y);
      // Sibling depth-3/4 containers in other cases keep their own axes instead of snapping to the ForEach axis.
      const axes = await Promise.all(['ForEach_nested', 'Scope_nested', 'Until_Nested'].map(async (id) => centreX(await box(page, id))));
      expect(new Set(axes.map(Math.round)).size).toBe(axes.length);
      if (flag === 'true') {
        await expect(page.locator('[data-node-count]')).toHaveCount(0);
      }
      await attachCanvas(page, testInfo, `nested-depth-flag-${flag}`);
    });

    test('collapsed and empty containers show unit-aware counts without editing the definition', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'All Scope Nodes', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      // Empty containers stay mounted on first load and never claim a count while expanded.
      for (const id of ['ForEach_empty-#scope', 'Scope_empty-#scope']) {
        await expect(card(page, id)).toHaveCount(1);
        await expect(card(page, id).locator('[data-node-count]')).toHaveCount(0);
      }
      const forEachNested = Object.keys(
        allScopeNodes.definition.actions.Switch.cases.ForEach_Case.actions.ForEach.actions.ForEach_nested.actions
      ).length;
      const scopeActions = Object.keys(allScopeNodes.definition.actions.Switch.cases.Scope_Case.actions.Scope.actions).length;
      // A collapsed If reports the actions in both branches, never its fixed two-branch metadata count.
      const condition = allScopeNodes.definition.actions.Switch.cases.Conditional_Case.actions.Condition;
      const conditionActions = Object.keys(condition.actions).length + Object.keys(condition.else.actions).length;
      // Depth 4 and depth 3 first, then the root Switch, so nested and root collapsed states are both exercised.
      await toggleGraph(page, 'ForEach_nested-#scope', flag);
      await toggleGraph(page, 'Scope-#scope', flag);
      await toggleGraph(page, 'Condition-#scope', flag);
      if (flag === 'true') {
        await expect(card(page, 'Condition-#scope').locator('[data-node-count="actions"]')).toHaveText(
          countText(conditionActions, 'Action', 'Actions')
        );
        await expect(card(page, 'ForEach_nested-#scope').locator('[data-node-count="actions"]')).toHaveText(
          countText(forEachNested, 'Action', 'Actions')
        );
        await expect(card(page, 'Scope-#scope').locator('[data-node-count="actions"]')).toHaveText(
          countText(scopeActions, 'Action', 'Actions')
        );
        await expect(page.locator('.no-actions-text')).toHaveCount(0);
      } else {
        await expect(page.getByTestId('scope-ForEach_nested-#scope-no-actions')).toBeVisible();
        await expect(page.getByTestId('scope-Scope-#scope-no-actions')).toBeVisible();
        await expect(page.getByTestId('scope-Condition-#scope-no-actions')).toBeVisible();
        await expect(page.locator('[data-node-count]')).toHaveCount(0);
      }
      await attachCanvas(page, testInfo, `collapsed-nested-flag-${flag}`);
      await toggleGraph(page, 'Switch-#scope', flag);
      if (flag === 'true') {
        await expect(card(page, 'Switch-#scope').locator('[data-node-count="cases"]')).toHaveText(
          countText(allScopeSwitchCases, 'Case', 'Cases')
        );
      } else {
        await expect(page.getByTestId('scope-Switch-#scope-no-actions')).toBeVisible();
      }
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions).toEqual(before.definition.actions);
      await attachCanvas(page, testInfo, `collapsed-switch-flag-${flag}`);
      await toggleGraph(page, 'Switch-#scope', flag);
      await expect(card(page, 'Switch-#scope').locator('[data-node-count]')).toHaveCount(0);
    });

    test('Switch with empty cases reports its case count and keeps empty case cards', async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Switch', flag);
      await expect(card(page, 'Second_Case-#subgraph')).toBeVisible();
      await expect(card(page, 'Third_Case-#subgraph')).toBeVisible();
      await attachCanvas(page, testInfo, `switch-empty-cases-flag-${flag}`);
      await toggleGraph(page, 'Switch-#scope', flag);
      if (flag === 'true') {
        await expect(card(page, 'Switch-#scope').locator('[data-node-count="cases"]')).toHaveText(
          countText(switchFixtureCases, 'Case', 'Cases')
        );
      } else {
        await expect(page.getByTestId('scope-Switch-#scope-no-actions')).toBeVisible();
      }
      await attachCanvas(page, testInfo, `switch-collapsed-flag-${flag}`);
    });

    test('multi-action agent tool chains keep their own tool axis', async ({ page }, testInfo) => {
      expect(multiActionTool, 'Agent fixture must contain a tool with more than one action.').toBeTruthy();
      const [toolId, tool] = multiActionTool!;
      const actionIds = Object.keys(tool.actions);
      await openSharedWorkflow(page, 'Simple Agent', flag);
      const toolCard = await box(page, `${toolId}-#subgraph`);
      const actions = await Promise.all(actionIds.map((id) => box(page, id)));
      if (flag === 'true') {
        // Shared tools run horizontally: the tool row and every action in its chain share one centre line.
        for (const action of actions) {
          expect(Math.abs(centreY(action) - centreY(toolCard))).toBeLessThanOrEqual(8);
        }
        for (let i = 1; i < actions.length; i++) {
          expect(actions[i].x).toBeGreaterThan(actions[i - 1].x + actions[i - 1].width);
        }
        // The tools panel heading states the tool count; the agent header must not repeat it.
        await expect(card(page, 'WorkflowAgent-#scope').locator('[data-node-count]')).toHaveCount(0);
        await attachCanvas(page, testInfo, `agent-tool-chain-flag-${flag}`);
        await toggleGraph(page, `${toolId}-#subgraph`, flag);
        await expect(card(page, `${toolId}-#subgraph`).locator('[data-node-count="actions"]')).toHaveText(
          countText(actionIds.length, 'Action', 'Actions')
        );
        await attachCanvas(page, testInfo, `agent-tool-collapsed-flag-${flag}`);
      } else {
        // Legacy keeps the vertical tool column below the tool header.
        expect(Math.abs(centreX(actions[0]) - centreX(actions[1]))).toBeLessThanOrEqual(1);
        expect(actions[0].y).toBeGreaterThan(toolCard.y);
        await expect(page.locator('[data-node-count]')).toHaveCount(0);
        await attachCanvas(page, testInfo, `agent-tool-chain-flag-${flag}`);
      }
    });

    for (const [fixture, run] of [
      ['Monitoring view conditional', 'normalState'],
      ['Simple Agent', 'sucessState'],
      ['Loops pager', 'SuccessRun'],
    ] as const) {
      test(`contained monitoring status stays inside cards and keeps vertical handle paths clear: ${fixture}`, async ({
        page,
      }, testInfo) => {
        await openSharedWorkflow(page, fixture, flag);
        await LoadRunFile(page, run);
        await waitForViewport(page);
        await attachCanvas(page, testInfo, `monitoring-${fixture.replaceAll(' ', '-').toLowerCase()}-flag-${flag}`);
        if (flag === 'false') {
          // Legacy monitoring is untouched: no shared badges or handle-axis metadata appear.
          await expect(page.locator('[data-badge-status]')).toHaveCount(0);
          await expect(page.locator('[data-handle-axis]')).toHaveCount(0);
          return;
        }
        const placements = await page.evaluate(() => {
          const minimumClearancePx = 4;
          const viewport = document.querySelector<HTMLElement>('.react-flow__viewport');
          const zoom = viewport ? new DOMMatrixReadOnly(getComputedStyle(viewport).transform).m11 : 1;
          const clearanceTo = (a: DOMRect, b: DOMRect) => Math.max(a.left - b.right, b.left - a.right, a.top - b.bottom, b.top - a.bottom);
          const inside = (inner: DOMRect, outer: DOMRect) =>
            inner.left >= outer.left && inner.top >= outer.top && inner.right <= outer.right && inner.bottom <= outer.bottom;
          const result: {
            node: string;
            axis: 'vertical' | 'horizontal';
            handles: number;
            subtitleContained: boolean;
            perimeterContained: boolean;
            subtitleClearance: number | null;
          }[] = [];
          for (const frame of document.querySelectorAll<HTMLElement>(
            '.react-flow__node [data-status-display="contained"][data-handle-axis]'
          )) {
            const axis = frame.getAttribute('data-handle-axis');
            if (axis !== 'vertical' && axis !== 'horizontal') {
              continue;
            }
            const node = frame.closest<HTMLElement>('.react-flow__node');
            const subtitle = frame.querySelector<HTMLElement>('[data-node-subtitle-kind="status"]');
            const perimeter = frame.querySelector<HTMLElement>('[data-node-status-perimeter]');
            const surface = perimeter?.parentElement;
            if (!subtitle || !perimeter || !surface || !frame.getClientRects().length) {
              continue;
            }
            const frameRect = surface.getBoundingClientRect();
            const subtitleRect = subtitle.getBoundingClientRect();
            const perimeterRect = perimeter.getBoundingClientRect();
            // Measure real incoming dots on this node only; nested nodes have their own handle coordinates.
            const handles = [...(node?.querySelectorAll<HTMLElement>('[data-handle]') ?? [])]
              .filter((handle) => handle.closest('.react-flow__node') === node)
              .map((handle) => handle.getBoundingClientRect())
              .filter(
                (rect) =>
                  rect.width > 0 &&
                  (axis === 'vertical' ? rect.top < frameRect.top + frameRect.height / 2 : rect.left < frameRect.left + frameRect.width / 2)
              );
            // Convert viewport pixels back to card pixels. The outline may meet a port; it is not a glyph box or hit target.
            const subtitleClearance = handles.length ? Math.min(...handles.map((rect) => clearanceTo(subtitleRect, rect))) / zoom : null;
            result.push({
              node: node?.getAttribute('data-id') ?? '',
              axis,
              handles: handles.length,
              subtitleContained: inside(subtitleRect, frameRect),
              perimeterContained: inside(perimeterRect, frameRect),
              subtitleClearance,
            });
          }
          return { minimumClearancePx, result };
        });
        // An empty set proves nothing, so require real contained status cards with measured vertical input handles.
        expect(placements.result.length).toBeGreaterThan(0);
        expect(placements.result.some((entry) => entry.axis === 'vertical' && entry.handles > 0)).toBe(true);
        await expect(page.locator('[data-badge-status]')).toHaveCount(0);
        for (const entry of placements.result) {
          expect.soft(entry.subtitleContained, `${entry.node} status subtitle must stay inside the card body`).toBe(true);
          expect.soft(entry.perimeterContained, `${entry.node} inset perimeter must stay inside the card body`).toBe(true);
          if (entry.subtitleClearance !== null) {
            expect
              .soft(
                entry.subtitleClearance,
                `${entry.node} ${entry.axis} status subtitle must clear input handles by at least ${placements.minimumClearancePx} card px`
              )
              .toBeGreaterThanOrEqual(placements.minimumClearancePx);
          }
        }
      });
    }
  });
}
