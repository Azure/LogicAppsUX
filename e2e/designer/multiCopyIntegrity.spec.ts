import { expect, test } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';

test.describe('Multi-action clipboard integrity', { tag: '@mock' }, () => {
  test.afterEach(async ({ page }, info) => {
    if (info.status !== info.expectedStatus) {
      console.error(`Designer document at ${page.url()}: ${await page.locator('body').innerText()}`);
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
    await page.goto('/v2?extraction=true&local=ExtractSelection.json');
    await expect(page.getByTestId('card-consume_result')).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().operations.loadStatus
              .nodesAndDynamicDataInitialized
        )
      )
      .toBe(true);
    const settings = page.getByRole('heading', { name: /Context Settings/ });
    const bounds = await settings.boundingBox();
    if (!bounds || bounds.y < 0) {
      await page.getByRole('button', { name: 'Toolbox' }).click();
    }
    await settings.click();
    await page.getByText('Dark Mode', { exact: true }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByLabel('Zoom view to fit', { exact: true }).click();
  });

  test('copies real selected metadata, pastes complete actions with internal tokens, and undoes/redoes once', async ({ page }) => {
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
    await expect(page.getByTestId('card-consume_result-copy')).toBeVisible();
    const copied = await getSerializedWorkflowFromStateV2(page);
    expect(copied.definition.actions['Build_result-copy'].inputs.message).toBe("@outputs('Build_message-copy')");
    expect(copied.definition.actions['Build_result-copy'].inputs.customer).toBe("@outputs('Read_customer')");
    expect(copied.definition.actions['Consume_result-copy'].inputs).toBe("@outputs('Build_result-copy')");
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    await expect(page.getByTestId('card-consume_result-copy')).toHaveCount(0);
    await expect(page.getByTestId('card-build_result-copy')).toHaveCount(0);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    await expect(page.getByTestId('card-consume_result-copy')).toBeVisible();
  });

  test('rejects the reported empty-data clipboard through the paste menu without changing the workflow', async ({ page }) => {
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
    const workflow = await getSerializedWorkflowFromStateV2(page);
    workflow.definition.actions = {
      Read_customer: { type: 'Compose', inputs: 'before', runAfter: {} },
      Condition: {
        type: 'If',
        expression: { equals: [1, 1] },
        actions: { True_action: { type: 'Compose', inputs: 'true branch', runAfter: {} } },
        else: { actions: { False_action: { type: 'Compose', inputs: 'false branch', runAfter: {} } } },
        runAfter: { Read_customer: ['Succeeded'] },
      },
      Consume_result: { type: 'Compose', inputs: 'after', runAfter: { Condition: ['Succeeded'] } },
    };
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
    await expect(page.getByTestId('card-condition')).toBeVisible();
    await page.getByLabel('Zoom view to fit', { exact: true }).click();
    for (const id of ['condition', 'true_action', 'false_action']) {
      await page.getByTestId(`card-${id}`).click({ modifiers: ['ControlOrMeta'] });
    }
    const extraction = page
      .getByTestId('multi-select-action-buttons')
      .getByRole('button', { name: 'Extract to new workflow', exact: true });
    await expect(extraction).toBeEnabled();
    await extraction.click();
    const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Condition');
    const preview = dialog.getByTestId('extraction-workflow-preview');
    await expect(preview.getByText('Condition', { exact: true })).toHaveCount(1);
    await expect(preview.getByText('True action', { exact: true })).toHaveCount(1);
    await expect(preview.getByText('False action', { exact: true })).toHaveCount(1);
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
    expect((await getSerializedWorkflowFromStateV2(page)).definition.actions.Condition).toEqual(workflow.definition.actions.Condition);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await getSerializedWorkflowFromStateV2(page)).toEqual(parent);
  });
});
