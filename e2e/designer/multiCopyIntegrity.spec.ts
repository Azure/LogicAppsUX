import { expect, test, type Page } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';

const closeToolboxInDarkMode = async (page: Page) => {
  const settings = page.getByRole('heading', { name: /Context Settings/ });
  const bounds = await settings.boundingBox();
  if (!bounds || bounds.y < 0) {
    await page.getByRole('button', { name: 'Toolbox' }).click();
  }
  const isDark = await page.evaluate(
    () => (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().designerOptions.isDarkMode
  );
  if (!isDark) {
    await settings.click();
    await page.getByText('Dark Mode', { exact: true }).click();
  }
  await page.getByRole('button', { name: 'Toolbox' }).click();
};

const fitWorkflowToCard = async (page: Page, cardId: string) => {
  await expect(async () => {
    await page.getByLabel('Zoom view to fit', { exact: true }).click();
    await expect(page.getByTestId(cardId)).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 20_000 });
};

const waitForLoadedDesigner = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (window as Window & { DesignerStoreV2?: { getState(): RootState } }).DesignerStoreV2?.getState().operations.loadStatus
            .nodesAndDynamicDataInitialized
      )
    )
    .toBe(true);
  await expect(page.getByTestId('card-request')).toBeVisible();
  await closeToolboxInDarkMode(page);
  await fitWorkflowToCard(page, 'card-consume_result');
};

const capturePreviewSource = (page: Page) =>
  page.evaluate(() => {
    const browser = window as Window & {
      DesignerStoreV2: { getState(): RootState };
      previewSource?: { slices: Record<string, unknown>; json: string };
    };
    const state = browser.DesignerStoreV2.getState();
    const slices = Object.fromEntries(
      [
        'workflow',
        'operations',
        'tokens',
        'connections',
        'panel',
        'customCode',
        'settings',
        'staticResults',
        'workflowParameters',
        'notes',
        'undoRedo',
      ].map((key) => [key, state[key as keyof RootState]])
    );
    browser.previewSource = { slices, json: JSON.stringify(slices) };
  });

const expectPreviewSourceUnchanged = async (page: Page) =>
  expect(
    await page.evaluate(() => {
      const browser = window as Window & {
        DesignerStoreV2: { getState(): RootState };
        previewSource?: { slices: Record<string, unknown>; json: string };
      };
      const state = browser.DesignerStoreV2.getState();
      const before = browser.previewSource!;
      const slices = Object.fromEntries(Object.keys(before.slices).map((key) => [key, state[key as keyof RootState]]));
      return {
        references: Object.entries(slices).every(([key, value]) => value === before.slices[key]),
        bytes: JSON.stringify(slices) === before.json,
      };
    })
  ).toEqual({ references: true, bytes: true });

const nativeCardGeometry = (page: Page, selector: string) =>
  page.locator(selector).evaluate((node) => {
    const card = node.querySelector<HTMLElement>('[role="button"], [role="img"]')!;
    const title = card.querySelector<HTMLElement>('.fui-Text')!;
    const style = getComputedStyle(card);
    const typography = getComputedStyle(title);
    return {
      width: card.offsetWidth,
      height: card.offsetHeight,
      padding: style.padding,
      radius: style.borderRadius,
      background: style.backgroundColor,
      fontSize: typography.fontSize,
      fontWeight: typography.fontWeight,
      lineHeight: typography.lineHeight,
      fontFamily: typography.fontFamily,
      icon: card.querySelector('img')?.getAttribute('src') ?? null,
    };
  });

test.describe('Multi-action clipboard integrity', { tag: '@mock' }, () => {
  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus) {
      console.error(`Designer document at ${page.url()}: ${await page.locator('body').innerText()}`);
      console.error(
        await page
          .locator('[data-automation-id^="card-"]')
          .evaluateAll((cards) => cards.map((card) => card.getAttribute('data-automation-id')))
      );
      console.error(
        await page.evaluate(() => {
          const store = (window as Window & { DesignerStoreV2?: { getState(): RootState } }).DesignerStoreV2;
          return store
            ? { operationErrors: store.getState().operations.errors, actions: Object.keys(store.getState().workflow.operations) }
            : 'Designer store not initialized';
        })
      );
    }
  });
  test.beforeEach(async ({ page, context, baseURL }) => {
    page.on('pageerror', (error) => console.error(`Designer page error: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.error(`Designer console error: ${message.text()}`);
      }
    });
    const origin = new URL(baseURL!).origin;
    await context.route('**/*', (route) => (new URL(route.request().url()).origin === origin ? route.continue() : route.abort()));
  });

  test('copies real selected metadata with offline built-in manifests, pastes internal tokens, and undoes/redoes once', async ({
    page,
  }) => {
    // Standard's offline HTTP stub cannot supply action manifests; Consumption supplies the real built-in manifests locally.
    await page.goto('/v2');
    await page.getByText('Consumption', { exact: true }).click();
    await page.getByRole('combobox', { name: 'Workflow File To Load' }).click();
    await page.getByRole('option', { name: 'Extract Selection', exact: true }).click();
    await waitForLoadedDesigner(page);
    for (const id of ['build_message', 'build_result', 'consume_result']) {
      await page.getByTestId(`card-${id}`).click({ modifiers: ['ControlOrMeta'] });
    }
    await page.getByTestId('card-build_message').click({ button: 'right' });
    await page.getByTestId('msla-bulk-copy-menu-option').click();
    const clipboard = await page.evaluate(async () => JSON.parse(await navigator.clipboard.readText()));
    expect(clipboard.nodes).toHaveLength(3);
    for (const node of clipboard.nodes) {
      expect(node.nodeData.nodeInputs.parameterGroups).toBeDefined();
    }
    await page.getByTestId('msla-plus-button-consume_result-undefined').click();
    await page.getByTestId('msla-paste-button-consume_result-undefined').click();
    await fitWorkflowToCard(page, 'card-consume_result_copy');
    const copied = await getSerializedWorkflowFromStateV2(page);
    expect(copied.definition.actions['Build_result-copy'].inputs.message).toBe("@outputs('Build_message-copy')");
    expect(copied.definition.actions['Build_result-copy'].inputs.customer).toBe("@outputs('Read_customer')");
    expect(copied.definition.actions['Consume_result-copy'].inputs).toBe("@outputs('Build_result-copy')");
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByTestId('card-consume_result_copy')).toHaveCount(0);
    await expect(page.getByTestId('card-build_result_copy')).toHaveCount(0);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await fitWorkflowToCard(page, 'card-consume_result_copy');
    expect(await getSerializedWorkflowFromStateV2(page)).toEqual(copied);
  });

  test('rejects the reported empty-data clipboard through the paste menu without changing the workflow', async ({ page }) => {
    await page.goto('/v2?extraction=true&local=ExtractSelection.json');
    await waitForLoadedDesigner(page);
    const original = await getSerializedWorkflowFromStateV2(page);
    await page.evaluate(async () =>
      navigator.clipboard.writeText(
        JSON.stringify({
          mslaNode: true,
          isMultiNode: true,
          nodes: [
            {
              nodeId: 'Initialize_variables-copy',
              nodeData: {},
              nodeOperationInfo: {
                connectorId: 'connectionProviders/variable',
                operationId: 'initializevariable',
                type: 'InitializeVariable',
              },
              isScopeNode: false,
            },
            { nodeId: 'Compose-copy', nodeData: {}, isScopeNode: false },
            {
              nodeId: 'Set_variable-copy',
              nodeData: {},
              nodeOperationInfo: { connectorId: 'connectionProviders/variable', operationId: 'setvariable', type: 'SetVariable' },
              isScopeNode: false,
            },
          ],
          edges: [
            { source: 'Set_variable-copy', target: 'Compose-copy' },
            { source: 'Initialize_variables-copy', target: 'Set_variable-copy' },
          ],
        })
      )
    );
    await page.getByTestId('msla-plus-button-consume_result-undefined').click();
    await page.getByTestId('msla-paste-button-consume_result-undefined').click();
    await expect(page.getByRole('alert')).toContainText('The clipboard does not contain complete action data');
    expect(await getSerializedWorkflowFromStateV2(page)).toEqual(original);
    await page.getByRole('button', { name: 'Dismiss', exact: true }).click();
    await expect(page.getByRole('alert')).toHaveCount(0);
  });

  test('extracts a complete Condition and both branch actions as one root with one-step undo and redo', async ({ page }) => {
    await page.goto('/v2?extraction=true&local=ExtractCondition.json');
    await waitForLoadedDesigner(page);
    await expect(page.getByTestId('card-condition')).toBeVisible();
    const nativeSelectors = [
      '.react-flow__node-SCOPE_CARD_NODE[data-id="Condition-#scope"]',
      '.react-flow__node-SUBGRAPH_CARD_NODE[data-id="Condition-actions-#subgraph"]',
      '.react-flow__node-SUBGRAPH_CARD_NODE[data-id="Condition-elseActions-#subgraph"]',
      '.react-flow__node-OPERATION_NODE[data-id="True_action"]',
    ];
    const nativeGeometry = await Promise.all(nativeSelectors.map((selector) => nativeCardGeometry(page, selector)));
    const originalCondition = (await getSerializedWorkflowFromStateV2(page)).definition.actions.Condition;
    await page.getByLabel('Zoom view to fit', { exact: true }).click();
    for (const id of ['condition', 'true_action', 'false_action']) {
      await page.getByTestId(`card-${id}`).click({ modifiers: ['ControlOrMeta'] });
    }
    const extraction = page
      .getByTestId('multi-select-action-buttons')
      .getByRole('button', { name: 'Extract to new workflow', exact: true });
    await expect(extraction).toBeEnabled();
    await capturePreviewSource(page);
    await extraction.click();
    const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Condition');
    const preview = dialog.getByTestId('extraction-workflow-preview');
    await expect(preview.getByText('Condition', { exact: true })).toHaveCount(1);
    await expect(preview.getByText('True', { exact: true })).toBeVisible();
    await expect(preview.getByText('False', { exact: true })).toBeVisible();
    await expect(preview.getByText('True action', { exact: true })).toBeVisible();
    await expect(preview.getByText('False action', { exact: true })).toBeVisible();
    await expect(preview.locator('.react-flow__node')).toHaveCount(10);
    for (const [index, selector] of nativeSelectors.entries()) {
      expect(await nativeCardGeometry(page, `[data-automation-id="extraction-workflow-preview"] ${selector}`)).toEqual(
        nativeGeometry[index]
      );
    }
    expect(nativeGeometry[0]).toMatchObject({ width: 200, height: 44, fontSize: '14px', fontWeight: '600', lineHeight: '20px' });
    expect(nativeGeometry[1]).toMatchObject({ width: 120, height: 32, fontSize: '14px', lineHeight: '16px' });
    expect(nativeGeometry[2]).toMatchObject({ width: 120, height: 32 });
    await expect(preview.locator('.react-flow__edge-ONLY_EDGE')).toHaveCount(2);
    await expect(preview.locator('.react-flow__edge-HEADING_EDGE path.react-flow__edge-path')).toHaveCount(2);
    await expect(preview.locator('.react-flow__edge-BUTTON_EDGE path[marker-end]')).toHaveCount(2);
    await expect(preview.locator('button:not([disabled])')).toHaveCount(3);
    expect(
      await preview.evaluate((element) => {
        const parents = Array.from(element.querySelectorAll('.react-flow__node-GRAPH_NODE, .react-flow__node-SUBGRAPH_NODE'), (node) =>
          Number(getComputedStyle(node).zIndex)
        );
        return Array.from(element.querySelectorAll('.react-flow__edge'), (edge) =>
          Number(getComputedStyle(edge.parentElement!).zIndex)
        ).every((zIndex) => zIndex > Math.max(...parents));
      })
    ).toBe(true);
    const sourceViewport = page.locator('.react-flow__viewport').first();
    const sourceTransform = await sourceViewport.getAttribute('style');
    await preview.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await preview.getByRole('button', { name: 'Zoom out', exact: true }).click();
    await preview.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
    const navigation = preview.getByRole('group', { name: 'Workflow preview navigation. Use arrow keys to pan.', exact: true });
    await navigation.focus();
    await navigation.press('ArrowLeft');
    await preview.getByText('Condition', { exact: true }).dblclick();
    await expect(preview.locator('.react-flow__node')).toHaveCount(10);
    await expect(sourceViewport).toHaveAttribute('style', sourceTransform!);
    await expectPreviewSourceUnchanged(page);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expectPreviewSourceUnchanged(page);
    await extraction.click();
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Condition');
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    const openChild = dialog.getByRole('link', { name: 'Open child workflow', exact: true });
    await expect(openChild).toBeVisible();
    const parent = await getSerializedWorkflowFromStateV2(page);
    expect(parent.definition.actions.Condition).toBeUndefined();
    expect(parent.definition.actions.True_action).toBeUndefined();
    expect(parent.definition.actions.False_action).toBeUndefined();
    const [childPage] = await Promise.all([page.waitForEvent('popup'), openChild.click()]);
    await expect(childPage.getByTestId('card-condition')).toBeVisible();
    const child = await getSerializedWorkflowFromStateV2(childPage);
    expect(child.definition.actions.Condition).toMatchObject({
      type: 'If',
      actions: { True_action: { type: 'Compose', inputs: 'true branch' } },
      else: { actions: { False_action: { type: 'Compose', inputs: 'false branch' } } },
    });
    expect(child.definition.actions.True_action).toBeUndefined();
    expect(child.definition.actions.False_action).toBeUndefined();
    await childPage.close();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions.Condition).toEqual(originalCondition);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await getSerializedWorkflowFromStateV2(page)).toEqual(parent);
  });

  test('previews nested scopes, empty condition branches, switch cases, loops and parallel dependencies without editing the source', async ({
    page,
  }) => {
    await page.goto('/v2?extraction=true&local=ExtractCondition.json');
    await waitForLoadedDesigner(page);
    const workflow = await getSerializedWorkflowFromStateV2(page);
    workflow.definition.actions = {
      Envelope: {
        type: 'Scope',
        runAfter: {},
        actions: {
          Condition: {
            type: 'If',
            expression: { equals: [1, 1] },
            runAfter: {},
            actions: { True_action: { type: 'Compose', inputs: 'true', runAfter: {} } },
            else: { actions: {} },
          },
          First: { type: 'Compose', inputs: 'first', runAfter: { Condition: ['Succeeded'] } },
          Second: { type: 'Compose', inputs: 'second', runAfter: { Condition: ['Succeeded'] } },
          Join: { type: 'Compose', inputs: 'join', runAfter: { First: ['Succeeded'], Second: ['Failed', 'TimedOut'] } },
          Case_switch: {
            type: 'Switch',
            expression: 'named',
            runAfter: { Join: ['Succeeded'] },
            cases: {
              Named_case: { case: 'named', actions: { Named_action: { type: 'Compose', inputs: 'named', runAfter: {} } } },
              Empty_case: { case: 'empty', actions: {} },
            },
            default: { actions: { Default_action: { type: 'Compose', inputs: 'default', runAfter: {} } } },
          },
          For_each: {
            type: 'Foreach',
            foreach: '@createArray(1)',
            runAfter: { Case_switch: ['Succeeded'] },
            actions: { Each_action: { type: 'Compose', inputs: 'each', runAfter: {} } },
          },
          Until: {
            type: 'Until',
            expression: '@true',
            limit: { count: 2, timeout: 'PT1H' },
            runAfter: { For_each: ['Succeeded'] },
            actions: {
              Until_action: { type: 'Compose', inputs: 'until', runAfter: {} },
              Long_action_title_that_wraps_across_several_lines: {
                type: 'Compose',
                inputs: 'long title',
                runAfter: { Until_action: ['Succeeded'] },
              },
            },
          },
        },
      },
      Consume_result: { type: 'Compose', inputs: 'after', runAfter: { Envelope: ['Succeeded'] } },
    };
    await page.evaluate(
      (workflow) =>
        localStorage.setItem(
          'msla-standalone-workflow-extraction-v1',
          JSON.stringify({
            version: 1,
            workflows: [{ id: 'ExtractCondition.json', name: 'ExtractCondition', workflow }],
            operations: [],
          })
        ),
      workflow
    );
    await page.reload();
    await waitForLoadedDesigner(page);
    const original = await getSerializedWorkflowFromStateV2(page);
    await page.evaluate(() => {
      const browser = window as Window & { DesignerStoreV2: { dispatch(action: { type: string; payload: string[] }): void } };
      // Use the real box-selection reducer; deep descendants may be virtualized outside the live viewport.
      browser.DesignerStoreV2.dispatch({
        type: 'panel/setNodeSelection',
        payload: [
          'Envelope',
          'Condition',
          'True_action',
          'First',
          'Second',
          'Join',
          'Case_switch',
          'Named_action',
          'Default_action',
          'For_each',
          'Each_action',
          'Until',
          'Until_action',
          'Long_action_title_that_wraps_across_several_lines',
        ],
      });
    });
    await capturePreviewSource(page);
    await page.getByTestId('multi-select-action-buttons').getByRole('button', { name: 'Extract to new workflow', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    const preview = dialog.getByTestId('extraction-workflow-preview');
    for (const label of [
      'Envelope',
      'Condition',
      'True',
      'False',
      'Named case',
      'Empty case',
      'Default',
      'Each action',
      'Do',
      'Until action',
    ]) {
      await expect(preview.getByText(label, { exact: true })).toHaveCount(1);
    }
    await expect(preview.locator('.react-flow__edge[data-id="First-Join"]')).toHaveCount(1);
    await expect(preview.locator('.react-flow__edge[data-id="Second-Join"]')).toHaveCount(1);
    await expect(preview.locator('.react-flow__edge[data-id="Second-Join"] path.react-flow__edge-path')).toHaveAttribute(
      'stroke-dasharray',
      '4 6'
    );
    await expect(preview.locator('.msla-run-after-dot')).toHaveCount(4);
    await expect
      .poll(() =>
        preview.evaluate((element) => {
          const action = element.querySelector<HTMLElement>(
            '.react-flow__node[data-id="Long_action_title_that_wraps_across_several_lines"]'
          )!;
          const card = action.querySelector<HTMLElement>('[role="img"]')!;
          const footer = element.querySelector<HTMLElement>('.react-flow__node[data-id="Until-#footer"]')!;
          return (
            card.offsetHeight > 44 &&
            action.offsetHeight === card.offsetHeight &&
            footer.getBoundingClientRect().top > card.getBoundingClientRect().bottom
          );
        })
      )
      .toBe(true);
    expect(
      await preview.evaluate((element) => {
        const first = element.querySelector('.react-flow__node[data-id="First"]')!.getBoundingClientRect();
        const second = element.querySelector('.react-flow__node[data-id="Second"]')!.getBoundingClientRect();
        const join = element.querySelector('.react-flow__node[data-id="Join"]')!.getBoundingClientRect();
        return first.x !== second.x && join.y > first.y && join.y > second.y;
      })
    ).toBe(true);
    await expectPreviewSourceUnchanged(page);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expectPreviewSourceUnchanged(page);
    expect(await getSerializedWorkflowFromStateV2(page)).toEqual(original);
  });
});
