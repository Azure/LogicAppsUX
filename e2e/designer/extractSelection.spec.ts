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

const isSharedNodeUi = process.env.SHARED_NODE_UI_EXTRACTION === 'true';
const sharedNodeQuery = isSharedNodeUi
  ? '&useSharedNodeUi=true'
  : process.env.SHARED_NODE_UI_EXTRACTION === 'false'
    ? '&useSharedNodeUi=false'
    : '';
const sourceUrl = `/v2?extraction=true&local=ExtractSelection.json${sharedNodeQuery}`;
const genericSourceUrl = `/v2?extraction=true&local=ExtractActions.json${sharedNodeQuery}`;

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

const ensureDarkMode = async (page: Page) => {
  const isDarkMode = () =>
    page.evaluate(
      () => (window as Window & { DesignerStoreV2: { getState(): RootState } }).DesignerStoreV2.getState().designerOptions.isDarkMode
    );
  if (await isDarkMode()) {
    return;
  }
  await page.getByRole('button', { name: 'Toolbox', exact: true }).evaluate(async (nub) => {
    await Promise.all(nub.parentElement!.getAnimations().map((animation) => animation.finished));
  });
  const contextSettings = page.getByRole('heading', { name: /Context Settings/ });
  const bounds = await contextSettings.boundingBox();
  const viewport = page.viewportSize();
  if (
    !bounds ||
    !viewport ||
    bounds.x < 0 ||
    bounds.y < 0 ||
    bounds.x + bounds.width > viewport.width ||
    bounds.y + bounds.height > viewport.height
  ) {
    await page.getByRole('button', { name: 'Toolbox' }).click();
  }
  if (!(await page.getByRole('checkbox', { name: 'Dark Mode', exact: true }).isVisible())) {
    await contextSettings.click();
  }
  await page.getByText('Dark Mode', { exact: true }).click();
  await expect.poll(isDarkMode).toBe(true);
  await page.getByRole('button', { name: 'Toolbox' }).click();
};

const openPreview = async (page: Page, names = ['Build_message', 'Build_result']) => {
  await ensureDarkMode(page);
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
  const milestones = dialog.getByRole('list', { name: 'Extraction progress', exact: true });
  await expect(milestones.getByRole('listitem')).toHaveCount(3);
  await expect(milestones.getByText(/^(Not started|Pending|Not confirmed)$/)).toHaveCount(0);
  await expect(
    dialog.getByText('The child can remain published if updating the source fails. Undo does not delete the child.', { exact: true })
  ).toHaveCount(0);
  await expect
    .poll(() =>
      dialog.evaluate((element) => {
        const channels = getComputedStyle(element).backgroundColor.match(/\d+/g);
        if (!channels || channels.length < 3) {
          throw new Error('The extraction dialog must have an opaque dark surface before capturing screenshots.');
        }
        return Math.max(...channels.slice(0, 3).map(Number));
      })
    )
    .toBeLessThan(128);
  await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
  return dialog;
};

test.describe('Extract selected actions in standalone', { tag: '@mock' }, () => {
  test.beforeEach(async ({ page, baseURL, context }) => {
    if (!baseURL) {
      throw new Error('A local standalone baseURL is required.');
    }
    const localOrigin = new URL(baseURL).origin;
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      return url.origin === localOrigin ? route.continue() : route.abort();
    });
    await page.goto(sourceUrl);
    await expect(page.getByTestId('card-consume_result')).toBeVisible();
    if (isSharedNodeUi) {
      await expect(page.getByTestId('card-consume_result')).toHaveAttribute('data-node-card', 'action');
    }
    await ensureDarkMode(page);
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

  test('traps native modal Tab and ShiftTab and restores the native card target after Escape and Cancel', async ({ page }, testInfo) => {
    const original = await readWorkflow(page);
    await selectActions(page, ['Read_customer', 'Build_message', 'Build_result']);
    const trigger = page.getByTestId('multi-select-action-buttons').getByRole('button', { name: 'Extract to new workflow', exact: true });
    await trigger.focus();
    await trigger.press('Enter');
    const dialog = page.getByRole('dialog', { name: 'Extract to new workflow', exact: true });
    const name = dialog.getByLabel('Workflow name', { exact: true });
    await expect(name).toBeFocused();
    const traversals: { key: string; targets: string[] }[] = [];
    for (const key of ['Tab', 'Shift+Tab']) {
      const targets: string[] = [];
      let returned = false;
      for (let step = 0; step < 40; step++) {
        await page.keyboard.press(key);
        const focus = await dialog.evaluate((surface) => {
          const element = surface.ownerDocument.activeElement;
          return {
            inside: !!element && surface.contains(element),
            target: element?.getAttribute('aria-label') ?? element?.textContent ?? '',
          };
        });
        expect(focus.inside).toBe(true);
        targets.push(focus.target);
        if (await name.evaluate((element) => element === element.ownerDocument.activeElement)) {
          returned = true;
          break;
        }
      }
      expect(returned).toBe(true);
      expect(targets.length).toBeGreaterThan(2);
      traversals.push({ key, targets });
    }
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('#msla-node-Build_result')).toBeFocused();
    const escapeFocus = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 500));
    const triggerTabsterAttributes = await trigger.getAttribute('data-tabster');
    expect(await readWorkflow(page)).toEqual(original);
    await trigger.focus();
    await trigger.press('Enter');
    await expect(name).toBeFocused();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('#msla-node-Build_result')).toBeFocused();
    const cancelFocus = await page.evaluate(() => document.activeElement?.outerHTML.slice(0, 500));
    expect(await readWorkflow(page)).toEqual(original);
    await testInfo.attach('native-modal-keyboard-traversal', {
      body: JSON.stringify({
        shared: isSharedNodeUi,
        traversals,
        escapeFocus,
        cancelFocus,
        triggerTabsterAttributes,
        restoration: 'Native Restorer returns to the existing card target; standalone Extract has no DialogTrigger/restorer target.',
      }),
      contentType: 'application/json',
    });
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
    await testInfo.attach('initial-preview-geometry', {
      body: JSON.stringify(
        await preview.evaluate((element) => ({
          viewport: element.querySelector('.react-flow__viewport')?.getAttribute('style'),
          nodes: [...element.querySelectorAll<HTMLElement>('.react-flow__node')].map((node) => ({
            id: node.dataset.id,
            style: node.getAttribute('style'),
            bounds: node.getBoundingClientRect().toJSON(),
            html: node.innerHTML.slice(0, 1600),
          })),
        })),
        null,
        2
      ),
      contentType: 'application/json',
    });
    await expect(preview.locator('.react-flow__edge')).toHaveCount(3);
    if (isSharedNodeUi) {
      await expect(preview.locator('[data-node-card="action"]').first()).toBeVisible();
    }
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
    const previewCard = nodes.nth(1).locator(isSharedNodeUi ? '[data-node-card="action"]' : '[title="Build message"]');
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
    if (isSharedNodeUi) {
      expect(await cardStyle(previewCard.locator(':scope > div').first())).toEqual(
        await cardStyle(designerCard.locator(':scope > div').first())
      );
      await expect(preview.locator('[data-node-card="trigger"]')).toHaveCount(1);
      await expect(preview.locator('[data-node-card="action"]')).toHaveCount(3);
      await expect(preview.locator('[data-handle], [data-tool-connector], [role="button"][data-node-card]')).toHaveCount(0);
      await expect(preview.locator('.react-flow__handle')).toHaveCount(8);
      await expect(preview.locator('path[data-line="solid"]')).toHaveCount(3);
      const mainIds = await editor.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
      const previewIds = await preview.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
      expect(previewIds.filter((id) => mainIds.includes(id))).toEqual([]);
      expect(new Set(previewIds).size).toBe(previewIds.length);
    }
    const titleStyle = (title: Locator) =>
      title.evaluate((element) => {
        const style = getComputedStyle(element);
        return { size: style.fontSize, weight: style.fontWeight, lineHeight: style.lineHeight };
      });
    expect(await titleStyle(previewCard.getByText('Build message', { exact: true }))).toEqual(
      await titleStyle(designerCard.getByText('Build message', { exact: true }))
    );
    const geometry = await previewCard.evaluate((card, shared) => {
      const bounds = card.getBoundingClientRect();
      const icon = card.querySelector(shared ? '[data-category]' : 'span[aria-hidden="true"]')!.getBoundingClientRect();
      const label = shared
        ? card.querySelector('[title="Build message"]')!.parentElement!.getBoundingClientRect()
        : card.querySelector('span:not([aria-hidden])')!.getBoundingClientRect();
      return {
        iconCenter: icon.y + icon.height / 2 - bounds.y,
        labelCenter: label.y + label.height / 2 - bounds.y,
        handleCenters: Array.from(card.querySelectorAll('.react-flow__handle'), (handle) => {
          const handleBounds = handle.getBoundingClientRect();
          return (handleBounds.x + handleBounds.width / 2 - bounds.x) / bounds.width;
        }),
      };
    }, isSharedNodeUi);
    expect(geometry.iconCenter).toBeCloseTo(geometry.labelCenter, 0);
    for (const center of geometry.handleCenters) {
      expect(center).toBeCloseTo(0.5, 2);
    }
    const readEdgeGeometry = () =>
      preview.evaluate((element, shared) => {
        const cards = Array.from(
          element.querySelectorAll(shared ? '.react-flow__node [data-node-card]' : '.react-flow__node [title]'),
          (card) => card.getBoundingClientRect()
        );
        return Array.from(element.querySelectorAll<SVGPathElement>('.react-flow__edge-path'), (path, index) => {
          const matrix = path.getScreenCTM()!;
          const start = path.getPointAtLength(0).matrixTransform(matrix);
          const end = path.getPointAtLength(path.getTotalLength()).matrixTransform(matrix);
          return {
            start: start.x,
            end: end.x,
            source: cards[index].x + cards[index].width / 2,
            target: cards[index + 1].x + cards[index + 1].width / 2,
            startY: start.y,
            endY: end.y,
            sourceY: cards[index].bottom,
            targetY: cards[index + 1].top,
          };
        });
      }, isSharedNodeUi);
    await expect
      .poll(async () =>
        Math.max(
          ...(await readEdgeGeometry()).flatMap((edge) => [
            Math.abs(edge.start - edge.source),
            Math.abs(edge.end - edge.target),
            ...(isSharedNodeUi ? [Math.abs(edge.startY - edge.sourceY), Math.abs(edge.endY - edge.targetY)] : []),
          ])
        )
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
    if (isSharedNodeUi) {
      const userViewport = await previewViewport.getAttribute('style');
      await dialog.getByLabel('Workflow name', { exact: true }).fill('Renamed_preview_child');
      await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeEnabled();
      await preview.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await expect(previewViewport).toHaveAttribute('style', userViewport ?? '');
    }
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
    const progressRegion = dialog.getByRole('region', { name: 'Extraction progress details', exact: true });
    await expect(progressRegion).toHaveCSS('padding-top', '16px');
    await expect(progressRegion).toHaveCSS('padding-bottom', '16px');
    const stepperSpacing = await progressRegion.evaluate((region) => {
      const bounds = region.getBoundingClientRect();
      const list = region.querySelector('ol')!.getBoundingClientRect();
      return { top: list.top - bounds.top, bottom: bounds.bottom - list.bottom };
    });
    expect(stepperSpacing.top).toBeGreaterThanOrEqual(16);
    expect(stepperSpacing.bottom).toBeGreaterThanOrEqual(16);
    await dialog.screenshot({ path: screenshotPath });
    await testInfo.attach('workflow-preview-dialog', { path: screenshotPath, contentType: 'image/png' });

    const bindings = dialog.getByRole('button', { name: 'Input and output bindings', exact: true });
    await expect(bindings).toHaveAttribute('aria-expanded', 'false');
    await bindings.click();
    await expect(dialog.getByRole('table')).toHaveCount(2);
    expect(
      await dialog.evaluate((element) => {
        const list = element.querySelector('ol');
        return (
          !!list &&
          [...element.querySelectorAll('table')].every((table) => table.compareDocumentPosition(list) & Node.DOCUMENT_POSITION_FOLLOWING)
        );
      })
    ).toBe(true);
    await dialog.getByRole('table').last().scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('list', { name: 'Extraction progress', exact: true })).toBeInViewport();
    await expect(dialog.getByRole('button', { name: 'Confirm', exact: true })).toBeInViewport();
    const expandedScreenshot = testInfo.outputPath('extraction-bindings-footer-dark.png');
    await dialog.screenshot({ path: expandedScreenshot });
    await testInfo.attach('extraction-bindings-footer-dark', { path: expandedScreenshot, contentType: 'image/png' });
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
    await dialog.getByRole('table').last().scrollIntoViewIfNeeded();
    await expect(dialog.getByRole('list', { name: 'Extraction progress', exact: true })).toBeInViewport();
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true);
    const narrowScreenshot = testInfo.outputPath('workflow-preview-dialog-narrow.png');
    expect(
      await dialog
        .locator('.fui-MessageBar')
        .first()
        .evaluate((banner) => banner.scrollHeight <= banner.clientHeight)
    ).toBe(true);
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

    const openChild = dialog.getByRole('link', { name: 'Open child workflow', exact: true });
    await expect(openChild).toBeVisible();
    await expect(openChild).toHaveAttribute('target', '_blank');
    await expect(openChild).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(openChild).toHaveAccessibleDescription('Opens in a new tab');
    const checklist = dialog.getByRole('list', { name: 'Extraction progress', exact: true });
    await expect(checklist.getByRole('listitem')).toContainText([
      'Prepare workflowsCompleted',
      'Create child workflowCompleted',
      'Update parent workflowCompleted',
    ]);
    const success = dialog.getByText('The child workflow was created and the source workflow was saved.', { exact: true });
    const close = dialog.getByRole('button', { name: 'Close', exact: true });
    await expect(success).toHaveCount(1);
    expect(
      await dialog.evaluate((element) => {
        const stepper = element.querySelector('ol')!;
        const banner = element.querySelector('[data-automation-id="extraction-workflow-success"]')!;
        const actions = element.querySelector('.fui-DialogActions')!;
        const link = actions.querySelector('a')!;
        return (
          !!(stepper.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          !!(banner.compareDocumentPosition(actions) & Node.DOCUMENT_POSITION_FOLLOWING) &&
          link.nextElementSibling?.textContent === 'Close'
        );
      })
    ).toBe(true);
    const linkBounds = await openChild.boundingBox();
    const closeBounds = await close.boundingBox();
    const stepperBounds = await checklist.boundingBox();
    const bannerBounds = await success.boundingBox();
    if (!linkBounds || !closeBounds || !stepperBounds || !bannerBounds) {
      throw new Error('Completed extraction milestones, success banner and adjacent actions must be visible.');
    }
    expect(linkBounds.y).toBeCloseTo(closeBounds.y, 0);
    expect(stepperBounds.y + stepperBounds.height).toBeLessThan(bannerBounds.y);
    expect(bannerBounds.y + bannerBounds.height).toBeLessThan(linkBounds.y);
    await openChild.focus();
    await page.keyboard.press('Tab');
    await expect(close).toBeFocused();
    const completedScreenshot = testInfo.outputPath('extraction-complete-dark.png');
    await dialog.screenshot({ path: completedScreenshot });
    await testInfo.attach('extraction-complete-dark', { path: completedScreenshot, contentType: 'image/png' });
    for (const height of [520, 320]) {
      await page.setViewportSize({ width: 500, height });
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await expect(openChild).toBeInViewport();
      const banner = dialog.getByTestId('extraction-workflow-success');
      expect(await banner.evaluate((element) => element.scrollHeight <= element.clientHeight)).toBe(true);
      await openChild.focus();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
    }
    await page.setViewportSize({ width: 1280, height: 900 });
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

    await openChild.focus();
    const [childPage] = await Promise.all([page.waitForEvent('popup'), openChild.press('Enter')]);
    await expect(dialog).toBeVisible();
    expect(await readWorkflow(page)).toEqual(source);
    await childPage.getByText('Local', { exact: true }).waitFor({ timeout: 120_000 });
    if (isSharedNodeUi) {
      const childUrl = new URL(childPage.url());
      childUrl.searchParams.set('useSharedNodeUi', 'true');
      await childPage.goto(childUrl.href);
      await expect(childPage.getByTestId('card-build_message')).toHaveAttribute('data-node-card', 'action');
    }
    await expect(childPage.getByTestId('card-build_message')).toBeVisible();
    await expect(childPage.getByTestId('card-build_result')).toBeVisible();
    const child = await readWorkflow(childPage);
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

    await childPage.reload();
    await childPage.getByText('Local', { exact: true }).waitFor({ timeout: 120_000 });
    await expect(childPage.getByTestId('card-build_result')).toBeVisible();
    expect(await readWorkflow(childPage)).toEqual(child);
    await childPage.close();

    await page.goto(sourceUrl);
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
    await expect(dialog.getByRole('link', { name: 'Open child workflow', exact: true })).toBeVisible();
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
      await page.goto(genericSourceUrl);
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
      const childLink = dialog.getByRole('link', { name: 'Open child workflow', exact: true });
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
      await page.goto(genericSourceUrl);
      await expect(page.getByTestId(`card-${invocationName.toLowerCase()}`)).toBeVisible();
      expect(await readWorkflow(page)).toEqual(source);
      expect((await readInvocationMetadata(page, invocationName)).outputs.outputs['outputs.$.body.output_Filter_array']).toMatchObject({
        type: 'array',
        isDynamic: true,
      });
    });
  }

  test('extracts a whole Scope with nested generic actions and its following action', async ({ page }) => {
    await page.goto(genericSourceUrl);
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
    await page.goto(genericSourceUrl);
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
    const openChild = dialog.getByRole('link', { name: 'Open child workflow', exact: true });
    await expect(openChild).toBeVisible();
    const source = await readWorkflow(page);
    expect(source.definition.actions.Processing).toBeUndefined();
    expect(source.definition.actions.Build_result).toBeUndefined();
    const [childPage] = await Promise.all([page.waitForEvent('popup'), openChild.click()]);
    await expect(childPage.getByTestId('card-processing')).toBeVisible();
    await expect(childPage.getByTestId('card-http')).toBeVisible();
    const child = await readWorkflow(childPage);
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
    await childPage.reload();
    await expect(childPage.getByTestId('card-http')).toBeVisible();
    expect(await readWorkflow(childPage)).toEqual(child);
    await childPage.close();
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
      await page.goto(sourceUrl);
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
        await expect(dialog.getByRole('link', { name: 'Open child workflow', exact: true })).toBeVisible();
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
    await expect(dialog.getByRole('link', { name: 'Open child workflow', exact: true })).toBeVisible();
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

  test('keeps long saved-source recovery details and Close reachable in narrow short viewports', async ({ page }, testInfo) => {
    const dialog = await openPreview(page);
    const details = 'Keep the durable child and parent workflows, review their bindings, and reload before editing. '.repeat(40);
    await page.evaluate((message) => {
      const store = (
        window as Window & {
          DesignerStoreV2: { dispatch(action: unknown): unknown };
        }
      ).DesignerStoreV2;
      const dispatch = store.dispatch;
      store.dispatch = (action) => {
        if (
          typeof action === 'object' &&
          action !== null &&
          'type' in action &&
          action.type === 'workflow/setIsWorkflowDirty' &&
          'meta' in action &&
          typeof action.meta === 'object' &&
          action.meta !== null &&
          'workflowExtraction' in action.meta &&
          action.meta.workflowExtraction
        ) {
          store.dispatch = dispatch;
          throw new Error(message);
        }
        return dispatch(action);
      };
    }, details);
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    const progress = dialog.getByRole('region', { name: 'Extraction progress details', exact: true });
    const parent = progress.getByRole('listitem').nth(2);
    await expect(parent).toContainText('Reload the source before editing.');
    await expect(parent).toContainText(details);
    const openChild = dialog.getByRole('link', { name: 'Open child workflow', exact: true });
    await expect(openChild).toHaveAttribute('target', '_blank');
    await expect(openChild).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(openChild).toHaveAccessibleDescription('Opens in a new tab');
    await expect(dialog.getByText('The child workflow was created and the source workflow was saved.', { exact: true })).toHaveCount(0);
    for (const height of [520, 320]) {
      await page.setViewportSize({ width: 500, height });
      await progress.scrollIntoViewIfNeeded();
      expect(await progress.evaluate((area) => area.clientHeight > 0 && area.scrollHeight > area.clientHeight)).toBe(true);
      await progress.focus();
      await progress.press('End');
      await expect.poll(() => progress.evaluate((area) => area.scrollTop)).toBeGreaterThan(0);
      const close = dialog.getByRole('button', { name: 'Close', exact: true });
      await close.scrollIntoViewIfNeeded();
      await expect(close).toBeInViewport();
      await expect(openChild).toBeInViewport();
      expect(await openChild.evaluate((link) => link.nextElementSibling?.textContent)).toBe('Close');
      await openChild.focus();
      await page.keyboard.press('Tab');
      await expect(close).toBeFocused();
      await close.focus();
      await expect(close).toBeFocused();
    }
    const screenshot = testInfo.outputPath('extraction-long-recovery-short-dark.png');
    await dialog.screenshot({ path: screenshot });
    await testInfo.attach('extraction-long-recovery-short-dark', { path: screenshot, contentType: 'image/png' });
    await dialog.getByRole('button', { name: 'Close', exact: true }).click();
    await expect(dialog).not.toBeVisible();
  });

  test('keeps the original workflow when local persistence fails', async ({ page }, testInfo) => {
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
    const milestones = dialog.getByRole('list', { name: 'Extraction progress', exact: true }).getByRole('listitem');
    const failure = 'Could not save local workflows (storage unavailable or full). Neither workflow was changed.';
    await expect(milestones.nth(0)).toContainText('Completed');
    await expect(milestones.nth(1)).toContainText(failure);
    await expect(milestones.nth(2)).toContainText(failure);
    const screenshot = testInfo.outputPath('extraction-error-dark.png');
    await dialog.screenshot({ path: screenshot });
    await testInfo.attach('extraction-error-dark', { path: screenshot, contentType: 'image/png' });
    expect(await readWorkflow(page)).toEqual(original);
    expect(await page.evaluate(() => localStorage.getItem('msla-standalone-workflow-extraction-v1'))).toBeNull();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('card-build_result')).toBeVisible();
  });
});
