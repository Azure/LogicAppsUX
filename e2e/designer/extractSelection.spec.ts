import { expect, test, type Locator, type Page } from '@playwright/test';
import type { RootState } from '../../libs/designer-v2/src/lib/core/store';
import { getSerializedWorkflowFromStateV2 } from './utils/designerFunctions';

interface WorkflowAction {
  type: string;
  inputs?: unknown;
  runAfter?: Record<string, string[]>;
  actions?: Record<string, WorkflowAction>;
  runtimeConfiguration?: Record<string, unknown>;
}

interface WorkflowSnapshot {
  definition: {
    actions: Record<string, WorkflowAction>;
    triggers: Record<string, WorkflowAction>;
    outputs?: Record<string, unknown>;
  };
  kind?: string;
  parameters?: Record<string, { type: string; value?: unknown }>;
}

const readWorkflow = (page: Page): Promise<WorkflowSnapshot> => getSerializedWorkflowFromStateV2(page);

const readInvocationMetadata = (page: Page, invocationName: string) =>
  page.evaluate((name) => {
    const state = (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState();
    return {
      ready: state.operations.loadStatus.nodesAndDynamicDataInitialized,
      inputStatus: state.operations.inputParameters[name]?.dynamicLoadStatus,
      outputs: state.operations.outputParameters[name],
      tokens: state.tokens.outputTokens[name],
    };
  }, invocationName);

const expectInvocationOutputs = (metadata: Awaited<ReturnType<typeof readInvocationMetadata>>, invocationName: string) => {
  expect(metadata.ready).toBe(true);
  expect(metadata.inputStatus).toBe('succeeded');
  expect(metadata.tokens.isLoading).not.toBe(true);
  for (const [key, type] of [
    ['outputs.$.body.output_Build_result', 'object'],
    ['outputs.$.body.output_Build_result.customer', 'object'],
    ['outputs.$.body.output_Build_result.customer.name', 'string'],
    ['outputs.$.body.output_Build_result.customer.id', 'string'],
  ]) {
    expect(metadata.outputs.outputs[key]).toMatchObject({ key, type, isDynamic: true });
    expect(metadata.tokens.tokens).toContainEqual(
      expect.objectContaining({
        key,
        type,
        outputInfo: expect.objectContaining({ isDynamic: true, actionName: invocationName }),
      })
    );
  }
};

const selectActions = async (page: Page, names: string[]) => {
  await page.getByLabel('Zoom view to fit', { exact: true }).click();
  for (const name of names) {
    await page.getByTestId(`card-${name.toLowerCase()}`).click({ modifiers: ['ControlOrMeta'] });
  }
};

const openSelectionMenu = async (page: Page, name: string) => {
  await page.getByTestId(`card-${name.toLowerCase()}`).click({ button: 'right' });
  await expect(page.getByTestId('msla-bulk-copy-menu-option')).toBeVisible();
};

const openPreview = async (page: Page, names = ['Build_message', 'Build_result']) => {
  await selectActions(page, names);
  if (names.length === 2) {
    await expect(page.locator('.msla-panel-container-nested-dual')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Extract to new workflow', exact: true })).toHaveCount(0);
    await openSelectionMenu(page, names[0]);
    await page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true }).click();
  } else {
    const actions = page.getByTestId('multi-select-action-buttons');
    await expect(actions.getByRole('button')).toHaveText(['Cut', 'Copy', 'Group', 'Extract', 'Delete']);
    await expect(page.getByRole('button', { name: 'Extract to new workflow', exact: true })).toHaveCount(1);
    await actions.getByRole('button', { name: 'Extract to new workflow', exact: true }).click();
  }
  const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
  return dialog;
};

test.describe('Extract selected actions in standalone', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page, baseURL }) => {
    if (!baseURL) {
      throw new Error('A local standalone baseURL is required.');
    }
    const localOrigin = new URL(baseURL).origin;
    await page.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === localOrigin ? route.continue() : route.abort();
    });
    await page.goto('/v2?extraction=true&local=ExtractSelection.json');
    await expect(page.getByTestId('card-consume_result')).toBeVisible();
    await page.getByRole('button', { name: 'Toolbox' }).click();
  });

  test('previews two selected actions and cancels without changing the source', async ({ page }) => {
    const original = await readWorkflow(page);
    const dialog = await openPreview(page);

    await expect(dialog.getByLabel('Workflow name', { exact: true })).toBeVisible();
    const bindings = dialog.getByRole('button', { name: 'Input and output bindings', exact: true });
    await expect(bindings).toHaveAttribute('aria-expanded', 'false');
    await expect(dialog.getByRole('table')).toHaveCount(0);
    await bindings.click();
    await expect(bindings).toHaveAttribute('aria-expanded', 'true');
    await expect(dialog.getByText('Inputs', { exact: true })).toBeVisible();
    await expect(dialog.getByText('Outputs', { exact: true })).toBeVisible();
    await expect(dialog.getByText(/^Replace \d+ actions with /)).toHaveCount(0);
    await expect(dialog.getByText('ExtractSelection / stateful', { exact: true })).toHaveCount(0);
    await expect(dialog.getByRole('columnheader')).toHaveText(['Original expression', 'Replacement', 'Original expression', 'Replacement']);
    await expect(dialog.getByRole('cell', { name: "@triggerBody()?['input_Read_customer']", exact: true })).toBeVisible();
    await expect(
      dialog.getByRole('cell', { name: "@body('Invoke_extracted_workflow')?['output_Build_result']", exact: true })
    ).toBeVisible();
    expect(await readWorkflow(page)).toEqual(original);
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();

    await expect(dialog).not.toBeVisible();
    expect(await readWorkflow(page)).toEqual(original);
    await expect(page.getByTestId('card-build_message')).toBeVisible();
    await expect(page.getByTestId('card-build_result')).toBeVisible();
  });

  test('navigates an isolated read-only flow preview above collapsible bindings', async ({ page }, testInfo) => {
    const original = await readWorkflow(page);
    const dialog = await openPreview(page);
    await expect
      .poll(() =>
        dialog.evaluate((element) => element.getAnimations().some((animation) => animation.playState === 'running' || animation.pending))
      )
      .toBe(false);
    const preview = dialog.getByTestId('extraction-workflow-preview');
    const details = dialog.getByTestId('extraction-workflow-details');
    const editor = page.locator('.react-flow').filter({ has: page.getByTestId('card-read_customer') });
    const editorViewport = editor.locator('.react-flow__viewport');
    const previewViewport = preview.locator('.react-flow__viewport');
    const editorTransform = await editorViewport.getAttribute('style');
    const selection = await page.evaluate(
      () =>
        (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent
          .selectedNodeIds
    );
    await expect(preview.locator('.react-flow__node')).toHaveCount(4);
    await expect(preview.locator('.react-flow__edge')).toHaveCount(3);
    const frame = preview.getByTestId('extraction-workflow-preview-frame');
    const canvas = preview.getByRole('region', { name: 'Child workflow preview', exact: true });
    await expect(details.getByRole('heading', { name: 'Extract to new workflow', exact: true })).toBeVisible();
    await expect(details.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
    await expect(preview.getByText('Extract to new workflow', { exact: true })).toHaveCount(0);
    await expect(preview.getByText('Pan and zoom to explore. Actions are read-only.', { exact: true })).toHaveCount(0);
    const dialogBounds = await dialog.boundingBox();
    const nameBounds = await dialog.getByLabel('Workflow name', { exact: true }).locator('..').boundingBox();
    const frameBounds = await frame.boundingBox();
    const canvasBounds = await canvas.boundingBox();
    const headingBounds = await preview.getByText('Child workflow preview', { exact: true }).boundingBox();
    if (!dialogBounds || !frameBounds || !nameBounds || !canvasBounds || !headingBounds) {
      throw new Error('The workflow name, compact preview, and floating heading must be visible.');
    }
    expect(frameBounds.x - dialogBounds.x).toBeCloseTo(17, 0);
    expect(dialogBounds.x + dialogBounds.width - frameBounds.x - frameBounds.width).toBeCloseTo(17, 0);
    expect(nameBounds.x).toBeCloseTo(frameBounds.x, 0);
    expect(nameBounds.width).toBeCloseTo(frameBounds.width, 0);
    expect(nameBounds.y + nameBounds.height).toBeLessThan(frameBounds.y);
    expect(canvasBounds.height).toBeCloseTo(320, 0);
    expect(headingBounds.x - canvasBounds.x).toBeCloseTo(16, 0);
    expect(headingBounds.y - canvasBounds.y).toBeCloseTo(16, 0);
    await expect(frame).toHaveCSS('border-width', '1px');
    await expect(frame).toHaveCSS('border-radius', '4px');
    await expect(preview).toHaveCSS('border-width', '0px');
    const nodes = preview.locator('.react-flow__node');
    for (const node of await nodes.all()) {
      await expect(node).not.toHaveClass(/\b(draggable|selectable)\b/);
    }
    const previewCard = nodes.nth(1).locator('[title="Build message"]');
    const designerCard = page.getByTestId('card-build_message');
    const cardStyle = (card: Locator) =>
      card.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          radius: style.borderRadius,
          shadow: style.boxShadow,
          padding: style.padding,
          gap: style.gap,
          width: style.width,
          height: style.height,
        };
      });
    expect(await cardStyle(previewCard)).toEqual(await cardStyle(designerCard));
    const titleStyle = (title: Locator) =>
      title.evaluate((element) => {
        const style = getComputedStyle(element);
        return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
      });
    expect(await titleStyle(previewCard.getByText('Build message', { exact: true }))).toEqual(
      await titleStyle(designerCard.getByText('Build message', { exact: true }))
    );
    const geometry = await previewCard.evaluate((card) => {
      const bounds = card.getBoundingClientRect();
      const icon = card.querySelector('span[aria-hidden="true"]')!.getBoundingClientRect();
      const label = card.querySelector('span:not([aria-hidden])')!.getBoundingClientRect();
      return {
        iconCenter: icon.y + icon.height / 2 - bounds.y,
        labelCenter: label.y + label.height / 2 - bounds.y,
        handleCenters: Array.from(card.querySelectorAll('.react-flow__handle'), (handle) => {
          const handleBounds = handle.getBoundingClientRect();
          return (handleBounds.x + handleBounds.width / 2 - bounds.x) / bounds.width;
        }),
      };
    });
    expect(geometry.iconCenter).toBeCloseTo(geometry.labelCenter, 0);
    for (const center of geometry.handleCenters) {
      expect(center).toBeCloseTo(0.5, 2);
    }
    const readEdgeGeometry = () =>
      preview.evaluate((element) => {
        const cards = Array.from(element.querySelectorAll('.react-flow__node [title]'), (card) => card.getBoundingClientRect());
        return Array.from(element.querySelectorAll<SVGPathElement>('.react-flow__edge-path'), (path, index) => {
          const matrix = path.getScreenCTM()!;
          const start = path.getPointAtLength(0).matrixTransform(matrix);
          const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
          return {
            start: start.x,
            end: end.x,
            source: cards[index].x + cards[index].width / 2,
            target: cards[index + 1].x + cards[index + 1].width / 2,
          };
        });
      });
    await expect
      .poll(async () =>
        Math.max(...(await readEdgeGeometry()).flatMap((edge) => [Math.abs(edge.start - edge.source), Math.abs(edge.end - edge.target)]))
      )
      .toBeLessThan(0.5);
    const nodeBounds = await nodes.nth(1).boundingBox();
    if (!nodeBounds) {
      throw new Error('The first extracted action must be visible in the preview.');
    }
    const nodeTransform = await nodes.nth(1).getAttribute('style');
    await page.mouse.click(nodeBounds.x + nodeBounds.width / 2, nodeBounds.y + nodeBounds.height / 2);
    await page.mouse.dblclick(nodeBounds.x + nodeBounds.width / 2, nodeBounds.y + nodeBounds.height / 2);
    await page.mouse.click(nodeBounds.x + nodeBounds.width / 2, nodeBounds.y + nodeBounds.height / 2, { button: 'right' });
    await expect(page.getByTestId('msla-bulk-copy-menu-option')).not.toBeVisible();
    await expect(preview.locator('.react-flow__node.selected')).toHaveCount(0);
    await expect(nodes.nth(1)).toHaveAttribute('style', nodeTransform ?? '');

    const beforeZoom = await previewViewport.getAttribute('style');
    await preview.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(previewViewport).not.toHaveAttribute('style', beforeZoom ?? '');
    await preview.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
    const beforePan = await previewViewport.getAttribute('style');
    const paneBounds = await preview.locator('.react-flow__pane').boundingBox();
    if (!paneBounds) {
      throw new Error('The preview canvas must support panning.');
    }
    await page.mouse.move(paneBounds.x + 16, paneBounds.y + 16);
    await page.mouse.down();
    await page.mouse.move(paneBounds.x + 76, paneBounds.y + 56, { steps: 5 });
    await page.mouse.up();
    await expect(previewViewport).not.toHaveAttribute('style', beforePan ?? '');
    await expect(editorViewport).toHaveAttribute('style', editorTransform ?? '');
    expect(await readWorkflow(page)).toEqual(original);
    expect(
      await page.evaluate(
        () =>
          (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().panel.operationContent
            .selectedNodeIds
      )
    ).toEqual(selection);
    await preview.getByRole('button', { name: 'Zoom view to fit', exact: true }).click();
    const screenshotPath = testInfo.outputPath('workflow-preview-dialog.png');
    await dialog.screenshot({ path: screenshotPath });
    await testInfo.attach('workflow-preview-dialog', { path: screenshotPath, contentType: 'image/png' });

    const bindings = dialog.getByRole('button', { name: 'Input and output bindings', exact: true });
    await expect(bindings).toHaveAttribute('aria-expanded', 'false');
    await bindings.click();
    await expect(dialog.getByRole('table')).toHaveCount(2);
    await bindings.click();
    await expect(dialog.getByRole('table')).toHaveCount(0);

    await page.setViewportSize({ width: 500, height: 900 });
    const narrowPreview = await preview.boundingBox();
    const narrowName = await dialog.getByLabel('Workflow name', { exact: true }).boundingBox();
    if (!narrowPreview || !narrowName) {
      throw new Error('The workflow name and preview must remain visible on a narrow screen.');
    }
    expect(narrowName.y + narrowName.height).toBeLessThan(narrowPreview.y);
    await bindings.click();
    await expect(dialog.getByRole('table')).toHaveCount(2);
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const narrowScreenshot = testInfo.outputPath('workflow-preview-dialog-narrow.png');
    await dialog.screenshot({ path: narrowScreenshot });
    await testInfo.attach('workflow-preview-dialog-narrow', { path: narrowScreenshot, contentType: 'image/png' });
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    expect(await readWorkflow(page)).toEqual(original);
  });

  test('creates a child with input/output bindings and replaces the source region', async ({ page }, testInfo) => {
    const original = await readWorkflow(page);
    const childName = 'Extracted_Customer_Message';
    const dialog = await openPreview(page);
    await dialog.getByLabel('Workflow name', { exact: true }).fill(childName);
    await testInfo.attach('extraction-preview', { body: await dialog.screenshot(), contentType: 'image/png' });
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();

    const childLink = dialog.getByRole('link', { name: childName, exact: true });
    await expect(childLink).toBeVisible();
    await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeEnabled();
    const source = await readWorkflow(page);
    const invocations = Object.entries(source.definition.actions).filter(([, action]) => action.type.toLowerCase() === 'workflow');
    expect(invocations).toHaveLength(1);
    const [invocationName, invocation] = invocations[0];
    expect(source.definition.actions.Build_message).toBeUndefined();
    expect(source.definition.actions.Build_result).toBeUndefined();
    expect(source.definition.actions.Read_customer).toEqual(original.definition.actions.Read_customer);
    expect(source.definition.triggers).toEqual(original.definition.triggers);
    expect(invocation.runAfter).toEqual(original.definition.actions.Build_message.runAfter);
    expect(invocation.inputs).toMatchObject({
      host: { workflow: { id: childName } },
      body: { input_Read_customer: "@outputs('Read_customer')" },
    });
    expect(source.definition.actions.Consume_result.runAfter).toEqual({
      [invocationName]: original.definition.actions.Consume_result.runAfter?.Build_result,
    });
    expect(JSON.stringify(source.definition.actions.Consume_result.inputs)).toContain(invocationName);
    expect(JSON.stringify(source.definition.actions.Consume_result.inputs)).not.toContain("outputs('Build_result')");
    await testInfo.attach('rewritten-source', { body: JSON.stringify(source, null, 2), contentType: 'application/json' });
    const invocationMetadata = await readInvocationMetadata(page, invocationName);
    await testInfo.attach('invocation-output-metadata', {
      body: JSON.stringify(invocationMetadata, null, 2),
      contentType: 'application/json',
    });
    expectInvocationOutputs(invocationMetadata, invocationName);

    await childLink.click();
    await page.getByText('Local', { exact: true }).waitFor({ timeout: 120_000 });
    await expect(page.getByTestId('card-build_message')).toBeVisible();
    await expect(page.getByTestId('card-build_result')).toBeVisible();
    const child = await readWorkflow(page);
    const requestTriggers = Object.values(child.definition.triggers).filter((trigger) => trigger.type.toLowerCase() === 'request');
    const responses = Object.values(child.definition.actions).filter((action) => action.type.toLowerCase() === 'response');
    expect(requestTriggers).toHaveLength(1);
    expect(responses).toHaveLength(1);
    expect(requestTriggers[0].inputs).toMatchObject({ schema: { type: 'object', properties: expect.any(Object) } });
    expect(responses[0].inputs).toMatchObject({
      statusCode: 200,
      schema: {
        type: 'object',
        properties: {
          output_Build_result: {
            type: 'object',
            properties: { customer: { type: ['object', 'null'] } },
          },
        },
      },
    });
    expect(child.definition.actions.Read_customer).toBeUndefined();
    expect(child.definition.actions.Consume_result).toBeUndefined();
    expect(JSON.stringify(child.definition.actions.Build_message.inputs)).toContain('triggerBody()');
    expect(JSON.stringify(child.definition.actions.Build_message.inputs)).not.toContain("outputs('Read_customer')");
    expect(JSON.stringify(responses[0].inputs)).toContain('Build_result');
    expect(child.kind).toBe(source.kind);
    await testInfo.attach('created-child', { body: JSON.stringify(child, null, 2), contentType: 'application/json' });

    await page.reload();
    await page.getByText('Local', { exact: true }).waitFor({ timeout: 120_000 });
    await expect(page.getByTestId('card-build_result')).toBeVisible();
    expect(await readWorkflow(page)).toEqual(child);

    await page.goto('/v2?extraction=true&local=ExtractSelection.json');
    await page.getByText('Local', { exact: true }).waitFor({ timeout: 120_000 });
    await expect(page.getByTestId(`card-${invocationName.toLowerCase()}`)).toBeVisible();
    await expect.poll(async () => (await readInvocationMetadata(page, invocationName)).ready).toBe(true);
    const reopenedMetadata = await readInvocationMetadata(page, invocationName);
    await testInfo.attach('reopened-source-output-metadata', {
      body: JSON.stringify(reopenedMetadata, null, 2),
      contentType: 'application/json',
    });
    expectInvocationOutputs(reopenedMetadata, invocationName);
    expect(reopenedMetadata.outputs.outputs).toEqual(invocationMetadata.outputs.outputs);
    expect(await readWorkflow(page)).toEqual(source);
  });

  test('supports the existing three-action multi-select panel with one-step undo', async ({ page }, testInfo) => {
    const original = await readWorkflow(page);
    const dialog = await openPreview(page, ['Read_customer', 'Build_message', 'Build_result']);
    await dialog.getByRole('button', { name: 'Input and output bindings', exact: true }).click();
    await expect(dialog.getByRole('cell', { name: "@triggerBody()?['input_Request']", exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    const actions = page.getByTestId('multi-select-action-buttons');
    const groupBounds = await actions.getByRole('button', { name: 'Group', exact: true }).boundingBox();
    const extractBounds = await actions.getByRole('button', { name: 'Extract to new workflow', exact: true }).boundingBox();
    const deleteBounds = await actions.getByRole('button', { name: 'Delete', exact: true }).boundingBox();
    expect(groupBounds).not.toBeNull();
    expect(extractBounds).not.toBeNull();
    expect(deleteBounds).not.toBeNull();
    expect(extractBounds?.y).toBe(groupBounds?.y);
    expect(extractBounds?.y).toBe(deleteBounds?.y);
    const screenshotPath = testInfo.outputPath('multi-select-actions.png');
    await actions.screenshot({ path: screenshotPath });
    await testInfo.attach('multi-select-actions', { path: screenshotPath, contentType: 'image/png' });
    await actions.getByRole('button', { name: 'Extract to new workflow', exact: true }).click();
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Three_Actions');
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Extracted_Three_Actions', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();

    const source = await readWorkflow(page);
    expect(Object.values(source.definition.actions).filter((action) => action.type.toLowerCase() === 'workflow')).toHaveLength(1);
    expect(source.definition.actions.Read_customer).toBeUndefined();
    expect(source.definition.actions.Build_message).toBeUndefined();
    expect(source.definition.actions.Build_result).toBeUndefined();
    await expect(page.getByTestId('card-consume_result')).toBeVisible();

    const savedRegistry = await page.evaluate(() => localStorage.getItem('msla-standalone-workflow-extraction-v1'));
    await page.getByRole('button', { name: 'Undo', exact: true }).click();
    expect(await readWorkflow(page)).toEqual(original);
    await expect(page.getByTestId('card-build_result')).toBeVisible();
    expect(await page.evaluate(() => localStorage.getItem('msla-standalone-workflow-extraction-v1'))).toBe(savedRegistry);
    await page.getByRole('button', { name: 'Redo', exact: true }).click();
    expect(await readWorkflow(page)).toEqual(source);
  });

  for (const includeVariableDeclaration of [false, true]) {
    test(`extracts generic Query and HTTP actions with ${includeVariableDeclaration ? 'contained' : 'incoming'} variable state`, async ({
      page,
    }, testInfo) => {
      await page.goto('/v2?extraction=true&local=ExtractActions.json');
      await expect(page.getByTestId('card-http')).toBeVisible();
      await page.getByRole('button', { name: 'Toolbox' }).click();
      const original = await readWorkflow(page);
      const selectedIds = includeVariableDeclaration
        ? ['Initialize_ArrayVariable', 'Parse_JSON', 'Filter_array', 'HTTP']
        : ['Filter_array', 'HTTP'];
      const childName = includeVariableDeclaration ? 'Extracted_Contained_Variable' : 'Extracted_Generic_Actions';
      const dialog = await openPreview(page, selectedIds);
      await dialog.getByLabel('Workflow name', { exact: true }).fill(childName);
      await expect(dialog.getByTestId('extraction-workflow-preview').locator('.react-flow__node')).toHaveCount(selectedIds.length + 2);
      await dialog.getByRole('button', { name: 'Input and output bindings', exact: true }).click();
      await expect(dialog.getByRole('cell', { name: "@body('HTTP')", exact: true })).toBeVisible();
      await expect(dialog.getByRole('cell', { name: "@outputs('HTTP')", exact: true })).toBeVisible();
      if (!includeVariableDeclaration) {
        await expect(dialog.getByRole('cell', { name: "@variables('ArrayVariable')", exact: true })).toBeVisible();
        await expect(dialog.getByRole('cell', { name: "@body('Parse_JSON')", exact: true })).toBeVisible();
      }
      await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
      const childLink = dialog.getByRole('link', { name: childName, exact: true });
      await expect(childLink).toBeVisible();
      const childHref = await childLink.getAttribute('href');
      expect(childHref).toBeTruthy();
      const source = await readWorkflow(page);
      for (const id of selectedIds) {
        expect(source.definition.actions[id]).toBeUndefined();
      }
      const invocationName = Object.keys(source.definition.actions).find((id) => source.definition.actions[id].type === 'Workflow');
      expect(invocationName).toBeDefined();
      if (!invocationName || !childHref) {
        throw new Error('Extraction must create an invocation and a link to the saved child.');
      }
      const metadata = await readInvocationMetadata(page, invocationName);
      expect(metadata.ready).toBe(true);
      expect(metadata.outputs.outputs['outputs.$.body.output_Filter_array']).toMatchObject({ type: 'array', isDynamic: true });
      expect(metadata.tokens.tokens).toContainEqual(
        expect.objectContaining({
          key: 'outputs.$.body.output_Filter_array',
          type: 'array',
          outputInfo: expect.objectContaining({ actionName: invocationName, isDynamic: true }),
        })
      );
      await testInfo.attach('generic-source', { body: JSON.stringify(source, null, 2), contentType: 'application/json' });

      await dialog.getByRole('button', { name: 'Close', exact: true }).click();
      await page.getByRole('button', { name: 'Undo', exact: true }).click();
      expect(await readWorkflow(page)).toEqual(original);
      await page.getByRole('button', { name: 'Redo', exact: true }).click();
      expect(await readWorkflow(page)).toEqual(source);

      await page.goto(childHref);
      await expect(page.getByTestId('card-http')).toBeVisible();
      const child = await readWorkflow(page);
      expect(child.definition.actions.Filter_array.type).toBe('Query');
      expect(child.definition.actions.HTTP.type).toBe('Http');
      expect(child.definition.actions.HTTP.runtimeConfiguration).toEqual(original.definition.actions.HTTP.runtimeConfiguration);
      expect(child.definition.actions.HTTP.inputs).toMatchObject({
        uri: 'https://example.test/items',
        method: 'POST',
        retryPolicy: { type: 'fixed', count: 2, interval: 'PT5S' },
        body: { filtered: "@body('Filter_array')" },
      });
      expect(child.parameters?.Minimum).toEqual(original.parameters?.Minimum);
      expect(child.definition.actions.Filter_array.inputs).toMatchObject({
        where: "@greaterOrEquals(item()?['min'], parameters('Minimum'))",
      });
      if (includeVariableDeclaration) {
        expect(child.definition.actions.Initialize_ArrayVariable).toEqual(original.definition.actions.Initialize_ArrayVariable);
        expect(child.definition.actions.HTTP.inputs).toMatchObject({ body: { original: "@variables('ArrayVariable')" } });
      } else {
        expect(child.definition.actions.Initialize_ArrayVariable).toBeUndefined();
        expect(child.definition.actions.Parse_JSON).toBeUndefined();
        expect(child.definition.actions.Filter_array.inputs).toMatchObject({ from: "@triggerBody()?['input_Parse_JSON']" });
        expect(child.definition.actions.HTTP.inputs).toMatchObject({ body: { original: "@triggerBody()?['input_ArrayVariable']" } });
      }
      expect(child.definition.actions.Response.inputs).toMatchObject({
        body: {
          output_HTTP: "@body('HTTP')",
          output_HTTP_2: "@outputs('HTTP')",
          output_Filter_array: "@body('Filter_array')",
        },
      });
      await testInfo.attach('generic-child', { body: JSON.stringify(child, null, 2), contentType: 'application/json' });
      await page.reload();
      await expect(page.getByTestId('card-http')).toBeVisible();
      expect(await readWorkflow(page)).toEqual(child);
      await page.goto('/v2?extraction=true&local=ExtractActions.json');
      await expect(page.getByTestId(`card-${invocationName.toLowerCase()}`)).toBeVisible();
      expect(await readWorkflow(page)).toEqual(source);
      expect((await readInvocationMetadata(page, invocationName)).outputs.outputs['outputs.$.body.output_Filter_array']).toMatchObject({
        type: 'array',
        isDynamic: true,
      });
    });
  }

  test('extracts a whole Scope with nested generic actions and its following action', async ({ page }) => {
    await page.goto('/v2?extraction=true&local=ExtractActions.json');
    await expect(page.getByTestId('card-http')).toBeVisible();
    const workflow = await readWorkflow(page);
    const { Initialize_ArrayVariable, Parse_JSON, Filter_array, HTTP, Consume_result } = workflow.definition.actions;
    workflow.definition.actions = {
      Initialize_ArrayVariable,
      Parse_JSON,
      Processing: {
        type: 'Scope',
        actions: {
          Filter_array: { ...Filter_array, runAfter: {} },
          HTTP,
        },
        runAfter: { Parse_JSON: ['SUCCEEDED'] },
      },
      Build_result: { ...Consume_result, runAfter: { Processing: ['SUCCEEDED'] } },
      Consume_result: { type: 'Compose', inputs: "@outputs('Build_result')", runAfter: { Build_result: ['SUCCEEDED'] } },
    };
    await page.evaluate(
      (workflow) =>
        localStorage.setItem(
          'msla-standalone-workflow-extraction-v1',
          JSON.stringify({
            version: 1,
            workflows: [{ id: 'ExtractActions.json', name: 'ExtractActions', workflow }],
            operations: [],
          })
        ),
      workflow
    );
    await page.goto('/v2?extraction=true&local=ExtractActions.json');
    await expect(page.getByTestId('card-processing')).toBeVisible();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await selectActions(page, ['Processing', 'Build_result']);
    await openSelectionMenu(page, 'Processing');
    await page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true }).click();
    const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Scope');
    const preview = dialog.getByTestId('extraction-workflow-preview');
    await expect(preview.locator('.react-flow__node')).toHaveCount(4);
    await expect(preview.getByText('Processing', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Extracted_Scope', exact: true })).toBeVisible();
    const source = await readWorkflow(page);
    expect(source.definition.actions.Processing).toBeUndefined();
    expect(source.definition.actions.Build_result).toBeUndefined();
    await dialog.getByRole('link', { name: 'Extracted_Scope', exact: true }).click();
    await expect(page.getByTestId('card-processing')).toBeVisible();
    await expect(page.getByTestId('card-http')).toBeVisible();
    const child = await readWorkflow(page);
    expect(child.definition.actions.Processing).toMatchObject({
      type: 'Scope',
      runAfter: {},
      actions: {
        Filter_array: {
          type: 'Query',
          inputs: { from: "@triggerBody()?['input_Parse_JSON']", where: "@greaterOrEquals(item()?['min'], parameters('Minimum'))" },
        },
        HTTP: {
          type: 'Http',
          inputs: { body: { original: "@triggerBody()?['input_ArrayVariable']" } },
          runAfter: { Filter_array: ['SUCCEEDED'] },
          runtimeConfiguration: HTTP.runtimeConfiguration,
        },
      },
    });
    expect(child.definition.actions.Processing.actions?.Filter_array.runAfter ?? {}).toEqual({});
    expect(child.definition.actions.Build_result.inputs).toEqual(Consume_result.inputs);
    expect(child.parameters?.Minimum).toEqual(workflow.parameters?.Minimum);
    await page.reload();
    await expect(page.getByTestId('card-http')).toBeVisible();
    expect(await readWorkflow(page)).toEqual(child);
  });

  test('rejects a selection with an unselected action in the gap', async ({ page }) => {
    const original = await readWorkflow(page);
    await selectActions(page, ['Read_customer', 'Build_result']);
    await expect(page.getByRole('button', { name: 'Extract to new workflow', exact: true })).toHaveCount(0);
    await openSelectionMenu(page, 'Read_customer');
    await expect(page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true })).toBeDisabled();
    expect(await readWorkflow(page)).toEqual(original);
  });

  test('requires a valid destination name before confirming', async ({ page }) => {
    const dialog = await openPreview(page);
    const name = dialog.getByLabel('Workflow name', { exact: true });
    await name.fill('');
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
    await name.fill('invalid/name');
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
    await name.fill('Valid_Workflow_Name');
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('opens with the first available workflow name instead of a collision error', async ({ page }) => {
    const workflow = await readWorkflow(page);
    const names = ['Extracted_workflow', 'Extracted_workflow_1', 'Extracted_workflow_2'];
    for (let index = 0; index < names.length; index++) {
      await page.evaluate(
        ({ workflow, existing }) =>
          localStorage.setItem(
            'msla-standalone-workflow-extraction-v1',
            JSON.stringify({
              version: 1,
              workflows: existing.map((name) => ({ id: `local:${name}`, name, workflow })),
              operations: [],
            })
          ),
        { workflow, existing: names.slice(0, index) }
      );
      if (index === 0) {
        await openPreview(page);
      } else {
        await openSelectionMenu(page, 'Build_message');
        await page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true }).click();
      }
      const dialog = page.getByRole('dialog', { name: 'Extract to new workflow' });
      const name = dialog.getByLabel('Workflow name', { exact: true });
      await expect(name).toHaveValue(names[index]);
      await expect(dialog.getByText(/already exists/)).toHaveCount(0);
      await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
      if (index > 0) {
        await name.fill(names[0]);
        await expect(dialog.getByText(/already exists/)).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeDisabled();
      }
      await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    }
    expect(await readWorkflow(page)).toEqual(workflow);
  });

  for (const { description, inputs, outputs } of [
    { description: 'input-only', inputs: true, outputs: false },
    { description: 'output-only', inputs: false, outputs: true },
    { description: 'no', inputs: false, outputs: false },
  ]) {
    test(`hides empty sections with ${description} IO bindings`, async ({ page }) => {
      const workflow = await readWorkflow(page);
      if (!inputs) {
        workflow.definition.actions.Build_message.inputs = 'A literal message';
        workflow.definition.actions.Build_result.inputs = {
          customer: { name: 'Ada', id: '123' },
          message: "@outputs('Build_message')",
        };
      }
      if (!outputs) {
        workflow.definition.actions.Consume_result.inputs = 'Done';
      }
      for (const action of Object.values(workflow.definition.actions)) {
        for (const parent of Object.keys(action.runAfter ?? {})) {
          action.runAfter![parent] = ['SUCCEEDED'];
        }
      }
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
      await page.goto('/v2?extraction=true&local=ExtractSelection.json');
      await expect(page.getByTestId('card-consume_result')).toBeVisible();
      const dialog = await openPreview(page);
      const bindings = dialog.getByRole('button', { name: 'Input and output bindings', exact: true });
      if (inputs || outputs) {
        await expect(bindings).toHaveAttribute('aria-expanded', 'false');
        await bindings.click();
      } else {
        await expect(bindings).toHaveCount(0);
      }
      await expect(dialog.getByRole('region', { name: 'Inputs', exact: true })).toHaveCount(inputs ? 1 : 0);
      await expect(dialog.getByRole('region', { name: 'Outputs', exact: true })).toHaveCount(outputs ? 1 : 0);
      await expect(dialog.getByRole('columnheader', { name: 'Binding', exact: true })).toHaveCount(0);
      await expect(dialog.getByRole('table')).toHaveCount(Number(inputs) + Number(outputs));
      if (!inputs && !outputs) {
        await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
        await expect(dialog.getByRole('link', { name: 'Extracted_workflow', exact: true })).toBeVisible();
        await expect(dialog.getByRole('button', { name: 'Close', exact: true })).toBeEnabled();
      } else {
        await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
      }
    });
  }

  test('does not offer extraction for Consumption workflows', async ({ page }) => {
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByText('Consumption', { exact: true }).click();
    await page.getByRole('button', { name: 'Toolbox' }).click();
    await expect(page.getByTestId('card-build_result')).toBeVisible();
    await selectActions(page, ['Build_message', 'Build_result']);
    await expect(page.getByRole('button', { name: 'Extract to new workflow', exact: true })).toHaveCount(0);
    await openSelectionMenu(page, 'Build_message');
    await expect(page.getByRole('menuitem', { name: 'Extract to new workflow', exact: true })).toHaveCount(0);
    await page.keyboard.press('Escape');
    await selectActions(page, ['Read_customer']);
    await expect(page.getByTestId('multi-select-action-buttons')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Extract to new workflow', exact: true })).toHaveCount(0);
  });

  test('retains the saved source when read-only mode reinitializes the designer', async ({ page }) => {
    const dialog = await openPreview(page);
    await dialog.getByLabel('Workflow name', { exact: true }).fill('Extracted_Readonly_Regression');
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog.getByRole('link', { name: 'Extracted_Readonly_Regression', exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    const savedSource = await readWorkflow(page);

    await page.getByRole('button', { name: 'Toolbox' }).click();
    await page.getByText('▼ Context Settings', { exact: true }).click();
    await page.getByText('Read Only', { exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Read Only', exact: true })).toBeChecked();
    await expect(async () => expect(await readWorkflow(page)).toEqual(savedSource)).toPass({ timeout: 30_000 });
    await page.getByText('Read Only', { exact: true }).click();
    await expect(page.getByRole('checkbox', { name: 'Read Only', exact: true })).not.toBeChecked();
    await expect(async () => expect(await readWorkflow(page)).toEqual(savedSource)).toPass({ timeout: 30_000 });
  });

  test('keeps the original workflow when local persistence fails', async ({ page }) => {
    const original = await readWorkflow(page);
    const dialog = await openPreview(page);
    await page.evaluate(() => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key: string, value: string) {
        if (key === 'msla-standalone-workflow-extraction-v1') {
          throw new DOMException('Simulated storage quota failure', 'QuotaExceededError');
        }
        return originalSetItem.call(this, key, value);
      };
    });
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(
      dialog.getByText('Could not save local workflows (storage unavailable or full). Neither workflow was changed.')
    ).toBeVisible();
    expect(await readWorkflow(page)).toEqual(original);
    expect(await page.evaluate(() => localStorage.getItem('msla-standalone-workflow-extraction-v1'))).toBeNull();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('card-build_result')).toBeVisible();
  });
});
