import { expect, test } from '@playwright/test';
import agentRun from '../../__mocks__/runs/Agent/sucessState.json' with { type: 'json' };
import { nodeHoverCardTiming } from '../../libs/designer-ui-v2/src/nodes/metrics';
import { defaultNodeStrings } from '../../libs/designer-ui-v2/src/nodes/strings';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { LoadRunFile } from './utils/GoToWorkflow';
import { openSharedWorkflow } from './utils/sharedNodeUi';

for (const flag of ['true', 'false'] as const) {
  test(
    `recorded Agent fixture through the normal run loader (not a live backend run), flag ${flag}`,
    { tag: ['@mock', '@shared-node-ui'] },
    async ({ page }, testInfo) => {
      await openSharedWorkflow(page, 'Simple Agent', flag);
      const before = await getSerializedWorkflowFromStateV2(page);
      const agent = page.locator('#msla-node-WorkflowAgent');
      const agentTitle = agent.getByText('WorkflowAgent', { exact: true });
      if (flag === 'true') {
        await agentTitle.hover();
        const info = page.locator('[data-node-info-card]');
        await expect(info).toBeVisible();
        await info.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(info).toBeHidden();
      }
      await LoadRunFile(page, 'sucessState');
      const pager = page.getByTestId('msla-pager-v2-workflowagent');
      await expect(pager).toBeVisible();
      const readIndex = () =>
        page.evaluate(
          () =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().workflow.nodesMetadata
              .WorkflowAgent.runIndex ?? 0
        );
      const original = await readIndex();
      await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
      expect(original).toBe(agentRun.properties.actions.WorkflowAgent.iterationCount - 1);
      const previous = flag === 'true' ? 'Previous iteration' : 'Previous';
      const next = flag === 'true' ? 'Next iteration' : 'Next';
      if (flag === 'true') {
        await expect(pager.getByRole('group', { name: 'Iterations', exact: true })).toBeVisible();
        await expect(pager.locator('[data-node-pager]')).toHaveCount(1);
        // Status belongs in the card name, not a canvas-wide set of live regions.
        // Derived from the fixture, not hard-coded. Imports stay on pure-data modules so Playwright's Node loader
        // never evaluates Fluent or SVG assets. Recorded statuses here map 1:1 to tone keys (Running -> running).
        const fixtureStatus = agentRun.properties.actions.WorkflowAgent.status.toLowerCase() as keyof typeof defaultNodeStrings.status;
        const expectedStatusLabel = defaultNodeStrings.status[fixtureStatus];
        expect(expectedStatusLabel).toBeTruthy();
        await expect(agent).toHaveAccessibleName(new RegExp(`WorkflowAgent.*${expectedStatusLabel}`, 'i'));
        await expect(page.locator('.fui-Badge[data-badge-status][role="status"]')).toHaveCount(0);
      }
      await pager.getByLabel(previous, { exact: true }).click();
      await expect.poll(readIndex).toBe(original - 1);
      await pager.getByLabel(next, { exact: true }).click();
      await expect.poll(readIndex).toBe(original);
      expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
      if (flag === 'true') {
        await agentTitle.hover();
        await page.waitForTimeout(nodeHoverCardTiming.openDelay + 100);
        await expect(page.locator('[data-node-info-card]')).toHaveCount(0);
      }
      await testInfo.attach('recorded-agent-evidence', {
        body: 'recorded fixture through the normal run loader; not a live backend run',
        contentType: 'text/plain',
      });
      await testInfo.attach('agent-monitoring-pager', {
        body: await page.screenshot({ animations: 'disabled' }),
        contentType: 'image/png',
      });
    }
  );
}

test(
  'recorded conditional fixture keeps status names quiet and skipped nodes fully opaque',
  { tag: ['@mock', '@shared-node-ui'] },
  async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Monitoring view conditional');
    const before = await getSerializedWorkflowFromStateV2(page);
    await LoadRunFile(page, 'normalState');
    const badges = page.locator('.fui-Badge[data-badge-status]');
    await expect(badges.first()).toBeVisible();
    await expect(badges.locator('xpath=self::*[@role="status"]')).toHaveCount(0);
    // Skipped is recorded run evidence, so it must never be dimmed as inactive.
    const response = page.locator('#msla-node-Response');
    await expect(response).toHaveAccessibleName(/Response.*Skipped/i);
    await expect(response).toHaveCSS('opacity', '1');
    await expect(page.locator('[data-inactive="true"]')).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('recorded-conditional-evidence', {
      body: 'recorded fixture through the normal run loader; not a live backend run',
      contentType: 'text/plain',
    });
  }
);

test(
  'in-progress conditional fixture dims actions without run evidence to 0.4 without compounding',
  { tag: ['@mock', '@shared-node-ui'] },
  async ({ page }, testInfo) => {
    await openSharedWorkflow(page, 'Monitoring view conditional');
    const before = await getSerializedWorkflowFromStateV2(page);
    // loadingState records only Delay (Running); every later action has no run status, which is the inactive contract.
    await LoadRunFile(page, 'loadingState');
    await expect(page.locator('#msla-node-Delay')).toHaveCSS('opacity', '1');
    const inactive = page.locator('[data-inactive="true"]');
    // Nested markers may remain semantic, but must not multiply 0.4 into 0.16.
    const visibleInactive = await inactive.evaluateAll((elements) =>
      elements.flatMap((element) => {
        if (element.getClientRects().length === 0) {
          return [];
        }
        let opacity = 1;
        let hasCollapsedAncestor = false;
        for (let current: Element | null = element; current; current = current.parentElement) {
          const style = getComputedStyle(current);
          if (
            style.display === 'none' ||
            style.visibility !== 'visible' ||
            Number(style.opacity) === 0 ||
            current.matches('[hidden], [aria-hidden="true"], [inert]')
          ) {
            return [];
          }
          hasCollapsedAncestor ||= current !== element && current.getAttribute('data-collapsed') === 'true';
          opacity *= Number(style.opacity);
        }
        return [{ opacity, hasCollapsedAncestor }];
      })
    );
    const uncollapsedInactive = visibleInactive.filter((element) => !element.hasCollapsedAncestor);
    // Collapsed-frame markers are valid evidence, but an empty set proves nothing about inactive opacity.
    const effectiveOpacities = uncollapsedInactive.length ? uncollapsedInactive : visibleInactive.slice(0, 1);
    expect(effectiveOpacities.length).toBeGreaterThan(0);
    for (const { opacity } of effectiveOpacities) {
      expect(opacity).toBeCloseTo(0.4, 5);
    }
    await expect(page.getByRole('button', { name: /Insert a new step/ })).toHaveCount(0);
    expect((await getSerializedWorkflowFromStateV2(page)).definition).toEqual(before.definition);
    await testInfo.attach('in-progress-conditional-evidence', {
      body: 'recorded in-progress fixture through the normal run loader; not a live backend run',
      contentType: 'text/plain',
    });
    await testInfo.attach('conditional-inactive-opacity', {
      body: await page.screenshot({ animations: 'disabled' }),
      contentType: 'image/png',
    });
  }
);
