import type { Locator, Page } from '@playwright/test';
import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

function linkedMap() {
  const map = createMap();
  map.pages[0].functoids.push(createMapFunctoid('f1', { label: 'Original label' }));
  map.pages[0].links.push(
    { ...createSchemaLink('input', paths.source.customerName, 'f1'), targetType: 'functoid', targetPath: undefined },
    { ...createSchemaLink('output', 'f1', paths.target.billToName), sourceType: 'functoid', sourcePath: undefined }
  );
  return map;
}

async function center(locator: Locator): Promise<{ x: number; y: number }> {
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  return { x: box!.x + box!.width / 2, y: box!.y + box!.height / 2 };
}

async function dragLink(page: Page, source: Locator, target: Locator): Promise<void> {
  const start = await center(source);
  const end = await center(target);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 12 });
  await expect(page.locator('.mapping-link-preview')).toHaveAttribute('d', /^M .+ C .+/);
  await page.mouse.up();
  await expect(page.locator('.mapping-link-preview')).toHaveCount(0);
}

test.describe('real pointer interactions', () => {
  test('Links toolbar moves independently, stays in the canvas, and keeps its controls usable', async ({ mapper }) => {
    await mapper.open({ map: linkedMap() });
    const { ui, host } = mapper;
    const toolbar = ui.page.getByRole('group', { name: 'Links toolbar', exact: true });
    const handle = toolbar.getByRole('button', { name: 'Move Links toolbar', exact: true });
    const viewport = ui.page.locator('biztalk-mapping-canvas');
    await expect(ui.page.locator('svg.mapping-nodes > text')).toHaveCount(0);
    await expect(ui.statusBar).toContainText('Links: 2');
    const original = (await toolbar.boundingBox())!;
    const start = await center(handle);
    await ui.page.mouse.move(start.x, start.y);
    await ui.page.mouse.down();
    await ui.page.mouse.move(start.x + 120, start.y + 140, { steps: 8 });
    await ui.page.mouse.up();
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.x)).toBe(Math.round(original.x + 120));
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.y)).toBe(Math.round(original.y + 140));

    await toolbar.getByRole('button', { name: 'Dim partial links', exact: true }).click();
    await expect(toolbar.getByRole('button', { name: 'Dim partial links', exact: true })).toHaveAttribute('aria-pressed', 'false');
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.x)).toBe(Math.round(original.x + 120));
    await handle.focus();
    await handle.press('ArrowRight');
    await expect.poll(async () => Math.round((await toolbar.boundingBox())!.x)).toBe(Math.round(original.x + 130));

    const movedHandle = await center(handle);
    const bounds = (await viewport.boundingBox())!;
    await ui.page.mouse.move(movedHandle.x, movedHandle.y);
    await ui.page.mouse.down();
    await ui.page.mouse.move(bounds.x + bounds.width - 1, bounds.y + bounds.height - 1, { steps: 8 });
    await ui.page.mouse.up();
    const isInsideCanvas = () =>
      toolbar.evaluate((element) => {
        const canvas = document.querySelector('biztalk-mapping-canvas')!.getBoundingClientRect();
        const tools = element.getBoundingClientRect();
        return tools.left >= canvas.left && tools.top >= canvas.top && tools.right <= canvas.right && tools.bottom <= canvas.bottom;
      });
    await expect.poll(isInsideCanvas).toBe(true);
    await ui.page.setViewportSize({ width: 1100, height: 650 });
    await expect.poll(isInsideCanvas).toBe(true);
    await expect(ui.links).toHaveCount(2);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('functoid nodes stay above crossing links even when the link is selected', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(
      createMapFunctoid('left', { x: 100, y: 180 }),
      createMapFunctoid('middle', { x: 300, y: 180 }),
      createMapFunctoid('right', { x: 500, y: 180 })
    );
    map.pages[0].links.push({
      id: 'crossing',
      sourceId: 'left',
      sourceType: 'functoid',
      targetId: 'right',
      targetType: 'functoid',
    });
    await mapper.open({ map });
    const { ui } = mapper;
    const node = ui.functoidNode(1);
    let crossing = await center(node.locator('.functoid-body'));
    const stackAtCrossing = () =>
      ui.page.evaluate(({ x, y }) => {
        const elements = document.elementsFromPoint(x, y);
        return {
          topNode: elements[0]?.closest('.functoid-node')?.getAttribute('data-id'),
          hasLink: elements.some((element) => element.closest('[data-link-id="crossing"]')),
        };
      }, crossing);

    await expect.poll(stackAtCrossing).toEqual({ topNode: 'middle', hasLink: true });
    await ui.link('crossing').focus();
    await ui.link('crossing').press('s');
    await expect(ui.link('crossing')).toHaveAttribute('aria-pressed', 'true');
    await expect(ui.link('crossing').locator('.mapping-link')).toHaveAttribute('stroke-width', '3');
    crossing = await center(node.locator('.functoid-body'));
    await ui.page.mouse.move(crossing.x, crossing.y);
    await expect.poll(stackAtCrossing).toEqual({ topNode: 'middle', hasLink: true });
    await ui.page.mouse.dblclick(crossing.x, crossing.y);
    await expect(ui.page.getByRole('dialog')).toBeVisible();
    await expect(ui.page.getByRole('dialog')).toContainText('String Concatenate');
  });

  test('the foreground node layer leaves blank canvas available for middle-button panning', async ({ mapper }) => {
    const map = linkedMap();
    map.pages[0].functoids.push(createMapFunctoid('offscreen', { x: 1600, y: 1200 }));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const viewport = ui.page.locator('biztalk-mapping-canvas');
    const box = (await viewport.boundingBox())!;
    const start = { x: box.x + box.width * 0.7, y: box.y + box.height * 0.7 };
    await ui.page.mouse.move(start.x, start.y);
    await ui.page.mouse.down({ button: 'middle' });
    await ui.page.mouse.move(start.x - 90, start.y - 60, { steps: 10 });
    await expect(viewport).toHaveClass(/panning/);
    await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await ui.page.mouse.up({ button: 'middle' });
    await expect(viewport).not.toHaveClass(/panning/);
    await expect(ui.links).toHaveCount(2);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('dragging source to target saves exactly one link and rejects a duplicate drag', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const source = ui.connector('source', paths.source.orderId);
    const target = ui.connector('target', paths.target.invoiceId);

    await dragLink(ui.page, source, target);

    await expect(ui.links).toHaveCount(1);
    await expect(source).toHaveClass(/connected/);
    await expect(target).toHaveClass(/connected/);
    expect(host.messages('update')).toHaveLength(1);
    expect(host.lastUpdatedMap()!.pages[0].links).toEqual([
      expect.objectContaining({
        sourceId: paths.source.orderId,
        sourcePath: paths.source.orderId,
        sourceType: 'schemaNode',
        targetId: paths.target.invoiceId,
        targetPath: paths.target.invoiceId,
        targetType: 'schemaNode',
      }),
    ]);
    const saved = host.lastUpdatedMap();

    await dragLink(ui.page, source, target);

    await expect(ui.toolbarStatus).toHaveText('Link already exists');
    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(1);
    expect(host.lastUpdatedMap()).toEqual(saved);
  });

  test('pointer drags wire a source through chained functoids to a target, including a reverse input drag', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1', { x: 180 }), createMapFunctoid('f2', { x: 420, y: 200 }));
    await mapper.open({ map });
    const { ui, host } = mapper;

    await dragLink(ui.page, ui.functoidInput(0), ui.connector('source', paths.source.customerName));
    await expect(ui.links).toHaveCount(1);
    await dragLink(ui.page, ui.functoidOutput(0), ui.functoidInput(1));
    await expect(ui.links).toHaveCount(2);
    await dragLink(ui.page, ui.functoidOutput(1), ui.connector('target', paths.target.billToName));

    await expect(ui.links).toHaveCount(3);
    const saved = host.lastUpdatedMap()!;
    expect(host.messages('update')).toHaveLength(3);
    expect(saved.pages[0].functoids).toEqual(map.pages[0].functoids);
    expect(saved.pages[0].links).toEqual([
      expect.objectContaining({ sourceId: paths.source.customerName, sourceType: 'schemaNode', targetId: 'f1', targetType: 'functoid' }),
      expect.objectContaining({ sourceId: 'f1', sourceType: 'functoid', targetId: 'f2', targetType: 'functoid' }),
      expect.objectContaining({ sourceId: 'f2', sourceType: 'functoid', targetId: paths.target.billToName, targetType: 'schemaNode' }),
    ]);
    expect(new Set(saved.pages[0].links.map((link) => link.id)).size).toBe(3);
    for (const connector of [ui.functoidInput(0), ui.functoidOutput(0), ui.functoidInput(1), ui.functoidOutput(1)]) {
      await expect(connector).toHaveClass(/connected/);
    }
  });

  test('native palette drag drops exactly one functoid at the canvas coordinates', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('existing', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const canvas = ui.page.locator('svg.mapping-svg');
    const viewport = ui.page.locator('biztalk-mapping-canvas');
    const before = await viewport.boundingBox();
    expect(before).not.toBeNull();
    const destination = { x: 180, y: 180 };

    await ui.paletteItem('Concatenate').dragTo(canvas, { targetPosition: destination });

    await expect(ui.functoidNodes).toHaveCount(1);
    await expect(viewport).not.toHaveClass(/drop-active/);
    expect(host.messages('update')).toHaveLength(1);
    const saved = host.lastUpdatedMap()!;
    expect(saved.pages[0].links).toEqual(map.pages[0].links);
    expect(saved.pages[0].functoids[0]).toMatchObject({
      functoidId: 107,
      name: 'String Concatenate',
      category: 'String',
      inputLinks: [],
      outputLinks: [],
      parameters: [],
    });
    expect(saved.pages[0].functoids[0].x).toBeCloseTo(destination.x, 0);
    expect(saved.pages[0].functoids[0].y).toBeCloseTo(destination.y, 0);
    const rendered = await center(ui.functoidNode());
    expect(rendered.x).toBeCloseTo(before!.x + destination.x, 0);
    expect(rendered.y).toBeCloseTo(before!.y + destination.y, 0);
  });

  test('moving a pressed functoid starts dragging without a hold and saves once on release', async ({ mapper }) => {
    const map = linkedMap();
    await mapper.open({ map });
    const { ui, host } = mapper;
    const node = ui.functoidNode();
    const start = await center(node);
    const originalPath = await ui.link('output').locator('.mapping-link').getAttribute('d');
    await ui.page.mouse.move(start.x, start.y);
    await ui.page.mouse.down();
    await expect(node).not.toHaveClass(/dragging/);
    await ui.page.mouse.move(start.x + 2, start.y + 1);
    await expect(node).not.toHaveClass(/dragging/);
    await ui.page.mouse.move(start.x + 103, start.y + 57);
    await expect(node).toHaveClass(/dragging/);
    await expect(node).toHaveAttribute('transform', 'translate(340, 180) scale(1)');
    expect(host.messages('update')).toHaveLength(0);

    await ui.page.mouse.up();

    await expect(node).not.toHaveClass(/dragging/);
    await expect(ui.link('output').locator('.mapping-link')).not.toHaveAttribute('d', originalPath!);
    expect(host.messages('update')).toHaveLength(1);
    expect(host.lastUpdatedMap()).toEqual({
      ...map,
      pages: [{ ...map.pages[0], functoids: [{ ...map.pages[0].functoids[0], x: 340, y: 180 }] }],
    });
    await expect(ui.links).toHaveCount(2);
  });

  test('a plain functoid click selects without dragging or saving a move', async ({ mapper }) => {
    await mapper.open({ map: linkedMap() });
    const { ui, host } = mapper;
    const node = ui.functoidNode();
    const originalTransform = await node.getAttribute('transform');

    await node.click();

    await expect(node.locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await expect(node).not.toHaveClass(/dragging/);
    await expect(node).toHaveAttribute('transform', originalTransform!);
    await expect(ui.page.getByRole('dialog')).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('dragging blank canvas pans the viewport without changing functoid coordinates or links', async ({ mapper }) => {
    const map = linkedMap();
    map.pages[0].functoids.push(createMapFunctoid('offscreen', { x: 1600, y: 1200 }));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const viewport = ui.page.locator('biztalk-mapping-canvas');
    const box = await viewport.boundingBox();
    expect(box).not.toBeNull();
    const start = { x: box!.x + box!.width * 0.7, y: box!.y + box!.height * 0.7 };
    const transform = await ui.functoidNode().getAttribute('transform');
    await ui.page.mouse.move(start.x, start.y);
    await ui.page.mouse.down();
    await ui.page.mouse.move(start.x - 90, start.y - 60, { steps: 10 });
    await expect(viewport).toHaveClass(/panning/);
    await expect.poll(() => viewport.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
    await ui.page.mouse.up();

    await expect(viewport).not.toHaveClass(/panning/);
    await expect(ui.functoidNode()).toHaveAttribute('transform', transform!);
    await expect(ui.links).toHaveCount(2);
    expect(host.messages('update')).toHaveLength(0);
    await ui.deployButton.click();
    await expect.poll(() => host.last('deployToLogicApps')?.data).toEqual(map);
  });

  test('releasing a link drag on blank canvas cancels it without a stale endpoint or map mutation', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const source = ui.connector('source', paths.source.orderId);
    const target = ui.connector('target', paths.target.invoiceId);

    await dragLink(ui.page, source, ui.page.locator('svg.mapping-svg'));

    await expect(ui.toolbarStatus).toHaveText('');
    await expect(ui.links).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
    await target.click();
    await expect(ui.links).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
    await ui.page.keyboard.press('Escape');
    await dragLink(ui.page, source, target);
    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(1);
    expect(host.lastUpdatedMap()!.pages[0].links[0]).toMatchObject({
      sourcePath: paths.source.orderId,
      targetPath: paths.target.invoiceId,
    });
  });

  test('Delete in a text editor must not delete the selected functoid and its links', async ({ mapper }) => {
    await mapper.open({ map: linkedMap() });
    const { ui, host } = mapper;
    await ui.functoidNode().click();
    await expect(ui.functoidNode().locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await ui.page.getByRole('button', { name: /Input Instance/ }).click();
    await ui.instanceEditor.fill('abc');
    await ui.instanceEditor.press('Home');
    await expect(ui.instanceEditor).toBeFocused();
    expect(host.messages('update')).toHaveLength(0);

    await ui.instanceEditor.press('Delete');

    test.fail(true, 'Global Delete handler ignores text editing focus and deletes the selected functoid and incident links.');
    await expect(ui.functoidNodes).toHaveCount(1, { timeout: 1_000 });
    await expect(ui.links).toHaveCount(2);
    await expect(ui.instanceEditor).toHaveValue('bc');
    expect(host.messages('update')).toHaveLength(0);
  });

  test('Escape from an edited functoid dialog closes it and discards drafts without changing the map', async ({ mapper }) => {
    const map = linkedMap();
    await mapper.open({ map });
    const { ui, host } = mapper;
    const dialog = ui.page.getByRole('dialog');
    await ui.functoidNode().dblclick();
    await expect(dialog).toBeVisible();
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    const label = dialog.getByRole('textbox', { name: 'Label', exact: true });
    await label.fill('Unsaved draft');
    await label.press('Escape');

    await expect(dialog).toHaveCount(0);
    await expect(ui.functoidNodes).toHaveCount(1);
    await expect(ui.links).toHaveCount(2);
    expect(host.messages('update')).toHaveLength(0);
    await ui.functoidNode().dblclick();
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await expect(label).toHaveValue('Original label');
    await label.press('Escape');
    await ui.deployButton.click();
    await expect.poll(() => host.last('deployToLogicApps')?.data).toEqual(map);
    expect(host.messages('update')).toHaveLength(0);
  });
});
