import { expect, test, type Locator } from '@playwright/test';
import type { LogicAppsV2 } from '@microsoft/logic-apps-shared';
import agentFixture from '../../__mocks__/workflows/AgentWithMcp.json' with { type: 'json' };
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';
import { setContextSetting } from './utils/sharedNodeUi';

const nested = { Nested: { type: 'Compose', inputs: 'preserved nested definition', runAfter: {} } };
const families: { operation: LogicAppsV2.ActionDefinition; card: string }[] = [
  { operation: { type: 'Scope', actions: nested }, card: 'action' },
  { operation: { type: 'If', expression: { equals: [1, 1] }, actions: nested, else: { actions: {} } }, card: 'if' },
  {
    operation: { type: 'Switch', expression: 1, cases: { Actual_case: { case: 1, actions: nested } }, default: { actions: {} } },
    card: 'switch',
  },
  { operation: { type: 'Foreach', foreach: '@createArray(1)', actions: nested }, card: 'foreach' },
  { operation: { type: 'Until', expression: '@equals(1,1)', limit: { count: 1, timeout: 'PT1H' }, actions: nested }, card: 'foreach' },
  {
    operation: {
      ...agentFixture.definition.actions.WorkflowAgent,
      tools: { Regular_Tool: agentFixture.definition.actions.WorkflowAgent.tools.Regular_Tool },
    },
    card: 'agent',
  },
];

const endpointError = (preview: Locator) =>
  preview.evaluate((element) => {
    const cards = new Map(
      [...element.querySelectorAll<HTMLElement>('[data-preview-operation-id]')].map((node) => [
        node.dataset.previewOperationId,
        node.querySelector('[data-node-card]')!.getBoundingClientRect(),
      ])
    );
    return Math.max(
      ...[...element.querySelectorAll<SVGPathElement>('.react-flow__edge-path')].flatMap((path) => {
        const [sourceId, targetId] = JSON.parse(path.closest('[data-id]')!.getAttribute('data-id')!);
        const source = cards.get(sourceId)!;
        const target = cards.get(targetId)!;
        const matrix = path.getScreenCTM()!;
        const start = path.getPointAtLength(0).matrixTransform(matrix);
        const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
        return [
          Math.abs(start.x - source.x - source.width / 2),
          Math.abs(start.y - source.bottom),
          Math.abs(end.x - target.x - target.width / 2),
          Math.abs(end.y - target.top),
        ];
      })
    );
  });

test.describe('Canonical shared extraction preview families', { tag: ['@mock', '@shared-node-ui'] }, () => {
  test.beforeEach(async ({ page, context, baseURL }) => {
    if (!baseURL) {
      throw new Error('The existing Standalone server is required.');
    }
    const origin = new URL(baseURL).origin;
    await context.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
    await page.goto('/v2?extraction=true&local=ExtractSelection.json&useSharedNodeUi=true');
    await expect(page.getByTestId('card-build_message')).toBeVisible();
  });

  for (const { operation, card } of families) {
    test(`previews the actual whole ${operation.type} with canonical geometry and no nested editing`, async ({ page }, testInfo) => {
      const pageErrors: string[] = [];
      page.on('pageerror', (error) => pageErrors.push(error.message));
      const workflow = await getSerializedWorkflowFromStateV2(page);
      workflow.definition.actions.Build_message = { ...operation, runAfter: { Read_customer: ['Succeeded'] } };
      await page.evaluate(
        (workflow) =>
          localStorage.setItem(
            'msla-standalone-workflow-extraction-v1',
            JSON.stringify({
              version: 1,
              workflows: [{ id: 'ExtractSelection.json', name: 'ExtractSelection', workflow }],
              operations: [],
            })
          ),
        workflow
      );
      await page.reload();
      const sourceCard = page.getByTestId('card-build_message');
      await expect(sourceCard).toHaveAttribute('data-node-card', card);
      await page.getByRole('button', { name: 'Toolbox', exact: true }).click();
      if (operation.type === 'Agent') {
        await setContextSetting(page, 'Dark Mode', true);
      }
      if (operation.type === 'Switch') {
        await page.emulateMedia({ reducedMotion: 'reduce', forcedColors: 'active' });
        expect(
          await page.evaluate(() => ({
            motion: matchMedia('(prefers-reduced-motion: reduce)').matches,
            colors: matchMedia('(forced-colors: active)').matches,
          }))
        ).toEqual({ motion: true, colors: true });
      }
      const original = await getSerializedWorkflowFromStateV2(page);
      const serialized = original.definition.actions.Build_message;
      const editorViewport = page.locator('.react-flow__viewport').first();
      await page.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      for (const name of ['Build result', 'Build message']) {
        await page
          .getByTestId(`card-${name.replace(' ', '_').toLowerCase()}`)
          .getByText(name, { exact: true })
          .click({ modifiers: ['ControlOrMeta'] });
      }
      await expect
        .poll(() =>
          page.evaluate(() =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState()
              .panel.operationContent.selectedNodeIds.slice()
              .sort()
          )
        )
        .toEqual(['Build_message', 'Build_result']);
      await expect(page.getByRole('heading', { name: 'Change connection', exact: true })).toHaveCount(0);
      await sourceCard.getByText('Build message', { exact: true }).click({ button: 'right' });
      await page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Extract to new workflow', exact: true });
      await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
      const preview = dialog.getByTestId('extraction-workflow-preview');
      await expect(preview.locator('[data-designer-ui-v2]')).toHaveAttribute(
        'data-designer-ui-v2',
        operation.type === 'Agent' ? 'dark' : 'light'
      );
      const paintedStyle = (card: Locator) =>
        card
          .locator(':scope > div')
          .first()
          .evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              background: style.backgroundColor,
              border: style.borderColor,
              borderWidth: style.borderWidth,
              borderStyle: style.borderStyle,
              color: style.color,
              surfaceVariable: style.getPropertyValue('--designer-ui-v2-node-surface'),
            };
          });
      expect(await paintedStyle(preview.locator('[data-preview-operation-id="Build_result"] [data-node-card]'))).toEqual(
        await paintedStyle(page.getByTestId('card-read_customer'))
      );
      const canvasPaint = await preview.locator('[role="region"]').evaluate((root) => {
        const probe = root.ownerDocument.createElement('span');
        probe.style.backgroundColor = 'var(--colorNeutralBackground1)';
        root.appendChild(probe);
        const expected = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return {
          expected,
          root: getComputedStyle(root).backgroundColor,
          flow: getComputedStyle(root.querySelector('.react-flow')!).backgroundColor,
          background: getComputedStyle(root.querySelector('.react-flow__background')!).backgroundColor,
        };
      });
      expect(canvasPaint.expected).not.toBe('rgba(0, 0, 0, 0)');
      expect(canvasPaint).toEqual({
        expected: canvasPaint.expected,
        root: canvasPaint.expected,
        flow: canvasPaint.expected,
        background: canvasPaint.expected,
      });
      const mainCanvasPaint = await page.locator('.msla-designer-canvas .react-flow').evaluate((flow) => ({
        root: getComputedStyle(flow).backgroundColor,
        background: getComputedStyle(flow.querySelector('.react-flow__background')!).backgroundColor,
      }));
      expect(mainCanvasPaint).toEqual({ root: canvasPaint.expected, background: canvasPaint.expected });
      await expect(preview.locator('.react-flow__node')).toHaveCount(4);
      await expect(preview.locator('path[data-line="solid"]')).toHaveCount(3);
      const projected = preview.locator('[data-node-id="Build_message"]');
      await expect(projected).toHaveAttribute('data-node-card', card);
      if (operation.type === 'Scope') {
        const mainHeader = sourceCard.getByText('Build message', { exact: true }).locator('..');
        const previewHeader = projected.getByText('Build message', { exact: true }).locator('..');
        expect(await mainHeader.textContent()).toBe('Build message');
        expect(await previewHeader.locator(':scope > span').allTextContents()).toEqual(
          await mainHeader.locator(':scope > span').allTextContents()
        );
      }
      await expect(projected).toHaveAccessibleName('');
      await expect(
        preview.locator('[data-handle], [data-tool-connector], [data-node-card="tool"], [data-node-card][role="button"]')
      ).toHaveCount(0);
      await expect(preview.locator('.react-flow__node[tabindex], [data-node-card][tabindex]')).toHaveCount(0);
      await expect(preview.locator('[data-preview-operation-id="Nested"]')).toHaveCount(0);
      if (operation.type === 'Agent') {
        await expect(
          projected.getByText(agentFixture.definition.actions.WorkflowAgent.inputs.parameters.deploymentId, { exact: true })
        ).toBeVisible();
      }
      await expect.poll(() => endpointError(preview)).toBeLessThan(0.5);
      const bounds = await preview
        .locator('[data-preview-operation-id] [data-node-card]')
        .evaluateAll((cards) => cards.map((node) => node.getBoundingClientRect().toJSON()));
      expect(bounds[1].top - bounds[0].bottom).toBeGreaterThan(0);
      expect(bounds[2].top - bounds[1].bottom).toBeGreaterThan(0);
      const naturalWidth = await projected.evaluate((element) => element.offsetWidth);
      expect(naturalWidth).toBe(await sourceCard.evaluate((element) => element.offsetWidth));
      const editorTransform = await editorViewport.getAttribute('style');
      const zoom = preview.getByRole('button', { name: 'Zoom in', exact: true });
      await zoom.focus();
      await expect(zoom).toBeFocused();
      await zoom.press('Enter');
      await expect(editorViewport).toHaveAttribute('style', editorTransform ?? '');
      await preview.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
      await expect.poll(() => endpointError(preview)).toBeLessThan(0.5);
      await dialog.screenshot({ path: testInfo.outputPath(`${operation.type}-preview.png`), animations: 'disabled' });
      await expect
        .poll(() =>
          dialog.evaluate((surface) => {
            const rect = surface.getBoundingClientRect();
            const outside: string[] = [];
            for (let x = rect.left + 10; x < rect.right - 10; x += 20) {
              for (const y of [rect.top + 3, rect.top + 15, rect.top + 30]) {
                const target = surface.ownerDocument.elementFromPoint(x, y);
                if (!target || !surface.contains(target)) {
                  outside.push(target?.outerHTML.slice(0, 200) ?? 'No hit target');
                }
              }
            }
            return outside;
          })
        )
        .toEqual([]);
      expect((await getSerializedWorkflowFromStateV2(page)).definition.actions.Build_message).toEqual(serialized);
      expect(pageErrors).toEqual([]);
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      expect(await getSerializedWorkflowFromStateV2(page)).toEqual(original);
    });
  }
});
