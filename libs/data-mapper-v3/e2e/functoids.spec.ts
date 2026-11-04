import { FunctoidRegistry } from '../src/functoids/functoidRegistry';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

const productionFunctoids = FunctoidRegistry.getInstance()
  .getAllFunctoids()
  .map((functoid) => ({
    id: functoid.id,
    name: functoid.name,
    category: functoid.category,
    description: functoid.description,
    minInputs: functoid.minInputs,
    maxInputs: functoid.maxInputs,
    hasOutput: functoid.hasOutput,
    tooltip: functoid.tooltip,
  }));

test.describe('functoids @p0', () => {
  for (const category of new Set(productionFunctoids.map((functoid) => functoid.category))) {
    test(`production catalogue renders every ${category} icon and inserts each functoid with its real identity`, async ({ mapper }) => {
      await mapper.open({ functoids: productionFunctoids });
      const { ui, host } = mapper;
      const expected = productionFunctoids.filter((functoid) => functoid.category === category);
      const group = ui.page.locator('.palette-category').filter({ has: ui.page.getByText(category, { exact: true }) });
      if ((await group.locator('.palette-item').count()) === 0) {
        await group.locator('.category-header').click();
      }
      await expect(group.locator('.palette-item')).toHaveCount(expected.length);
      for (const [index, definition] of expected.entries()) {
        const item = group.locator('.palette-item').nth(index);
        await expect(item).toHaveAttribute('title', definition.tooltip);
        await expect(item.locator('.item-name')).not.toHaveText('');
        await expect(item.locator('.item-icon svg')).toBeVisible();
        const updated = host.waitForNext('update');
        await item.click();
        const saved = (await updated).data.pages[0].functoids;
        expect(saved).toHaveLength(index + 1);
        expect(saved.at(-1)).toMatchObject({ functoidId: definition.id, name: definition.name, category });
        expect(new Set(saved.map((functoid) => functoid.id)).size).toBe(saved.length);
        await expect(ui.functoidNodes).toHaveCount(saved.length);
        await expect(ui.functoidNode(index).locator('.functoid-body')).toBeVisible();
      }
      expect(host.messages('update')).toHaveLength(expected.length);
      expect(host.messages('compile')).toHaveLength(0);
      expect(host.lastUpdatedMap()!.pages[0].links).toEqual([]);
    });
  }

  test('clicking a palette item adds one functoid to the page and notifies the host', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.addFunctoid('Concatenate');

    await expect(ui.functoidNodes).toHaveCount(1);
    const [functoid] = host.lastUpdatedMap()!.pages[0].functoids;
    expect(functoid).toMatchObject({ functoidId: 107, name: 'String Concatenate', category: 'String' });
    expect(host.messages('update')).toHaveLength(1);
  });

  test('wiring source -> functoid -> target creates two links', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.addFunctoid('Concatenate');
    await expect(ui.functoidNodes).toHaveCount(1);

    await ui.connector('source', paths.source.customerName).click();
    await ui.functoidInput().click();
    await ui.functoidOutput().click();
    await ui.connector('target', paths.target.billToName).click();

    await expect(ui.links).toHaveCount(2);
    const { links, functoids } = host.lastUpdatedMap()!.pages[0];
    const functoidId = functoids[0].id;
    expect(links).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceType: 'schemaNode',
          sourcePath: paths.source.customerName,
          targetType: 'functoid',
          targetId: functoidId,
        }),
        expect.objectContaining({
          sourceType: 'functoid',
          sourceId: functoidId,
          targetType: 'schemaNode',
          targetPath: paths.target.billToName,
        }),
      ])
    );
  });

  test('selecting a functoid and pressing Delete removes it and its links', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    map.pages[0].links.push(
      { ...createSchemaLink('in', paths.source.customerName, 'f1'), targetPath: undefined, targetType: 'functoid' as never },
      { ...createSchemaLink('out', 'f1', paths.target.billToName), sourcePath: undefined, sourceType: 'functoid' as never }
    );
    await mapper.open({ map });
    const { ui, host } = mapper;
    await expect(ui.links).toHaveCount(2);

    await ui.functoidNode().click();
    await expect(ui.functoidNode().locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    await ui.page.keyboard.press('Delete');

    await expect(ui.functoidNodes).toHaveCount(0);
    await expect(ui.links).toHaveCount(0);
    const page = host.lastUpdatedMap()!.pages[0];
    expect(page.functoids).toEqual([]);
    expect(page.links).toEqual([]);
  });

  test('double-clicking a functoid opens its configuration dialog and Escape closes it', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    await mapper.open({ map });
    const { ui } = mapper;
    const dialog = ui.page.getByRole('dialog');

    await ui.functoidNode().dblclick();
    await expect(dialog).toBeVisible();

    await ui.page.keyboard.press('Escape');
    await expect(dialog).toHaveCount(0);
  });

  test('search filters across collapsed categories and clearing restores the palette', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    const search = ui.page.getByPlaceholder('Search functoids...');

    await expect(ui.paletteItem('Sum')).toHaveCount(0);
    await search.fill('cUmUlAtIvE');
    await expect(ui.paletteItem('Sum')).toBeVisible();
    await expect(ui.paletteItem('Concatenate')).toHaveCount(0);
    await search.fill('no matching functoid');
    await expect(ui.page.locator('.palette-item')).toHaveCount(0);
    await search.selectText();
    await search.press('Backspace');
    await expect(search).toHaveValue('');
    await expect(ui.paletteItem('Concatenate')).toBeVisible();
    await ui.paletteCategoryHeader('String').click();
    await expect(ui.paletteItem('Concatenate')).toHaveCount(0);
    await ui.paletteCategoryHeader('String').click();
    await expect(ui.paletteItem('Concatenate')).toBeVisible();
    expect(host.messages('update')).toHaveLength(0);
  });

  test('collapsing and expanding the palette keeps existing mappings intact', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;

    await ui.page.getByRole('button', { name: 'Collapse functoids', exact: true }).click();
    await expect(ui.page.getByPlaceholder('Search functoids...')).toHaveCount(0);
    await expect(ui.links).toHaveCount(1);
    await ui.page.getByRole('button', { name: 'Expand functoids', exact: true }).click();
    await expect(ui.paletteItem('Concatenate')).toBeVisible();
    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('configuration enforces input limits and saves ordered constants label and comments', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.addFunctoid('Concatenate');
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    const save = dialog.getByRole('button', { name: 'OK', exact: true });
    const add = dialog.getByRole('button', { name: 'Add input', exact: true });

    await expect(save).toBeDisabled();
    await add.click();
    await dialog.getByRole('textbox', { name: 'Value for input 1', exact: true }).fill('First');
    await expect(save).toBeDisabled();
    await add.click();
    await dialog.getByRole('textbox', { name: 'Value for input 2', exact: true }).fill('Second');
    await expect(save).toBeEnabled();
    await dialog.locator('[data-input-action="up"][data-index="1"]').click();
    await expect(dialog.getByRole('textbox', { name: 'Value for input 1', exact: true })).toHaveValue('Second');
    await expect(dialog.getByRole('textbox', { name: 'Value for input 2', exact: true })).toHaveValue('First');
    for (const index of [2, 3, 4]) {
      await add.click();
      await dialog.getByRole('textbox', { name: `Value for input ${index + 1}`, exact: true }).fill(`Extra ${index}`);
    }
    await expect(add).toBeDisabled();
    for (const index of [4, 3, 2]) {
      await dialog.locator(`[data-input-action="remove"][data-index="${index}"]`).click();
    }
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Label', exact: true }).fill('Customer label');
    await dialog.getByRole('textbox', { name: 'Comments', exact: true }).fill('Concatenates customer values');
    const updated = host.waitForNext('update');
    await save.click();
    const functoid = (await updated).data.pages[0].functoids[0];

    expect(functoid).toMatchObject({ label: 'Customer label', comments: 'Concatenates customer values' });
    expect(functoid.parameters.map((parameter) => ({ type: parameter.type, value: parameter.value }))).toEqual([
      { type: 'constant', value: 'Second' },
      { type: 'constant', value: 'First' },
    ]);
    await expect(dialog).toHaveCount(0);
    await ui.functoidNode().dblclick();
    await expect(dialog.getByRole('textbox', { name: 'Value for input 1', exact: true })).toHaveValue('Second');
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('Customer label');
    await expect(dialog.getByRole('textbox', { name: 'Comments', exact: true })).toHaveValue('Concatenates customer values');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('link labels name functoid inputs and outputs without drawing text on links', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    map.pages[0].links.push(
      {
        ...createSchemaLink('in', paths.source.customerName, 'f1'),
        targetPath: undefined,
        targetType: 'functoid' as never,
        label: 'Country Code',
      },
      {
        ...createSchemaLink('out', 'f1', paths.target.billToName),
        sourcePath: undefined,
        sourceType: 'functoid' as never,
        label: 'Customer result',
      }
    );
    await mapper.open({ map });
    const { ui } = mapper;
    await expect(ui.links).toHaveCount(2);
    await expect(ui.links.locator('text')).toHaveCount(0);
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await expect(dialog.getByText('Country Code', { exact: true })).toBeVisible();
    await expect(dialog.getByText(`Source: ${paths.source.customerName}`, { exact: true })).toHaveCount(0);
    await dialog.getByRole('tab', { name: 'Outputs', exact: true }).click();
    await expect(dialog.getByText('Customer result', { exact: true })).toBeVisible();
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('constant and fallback input boxes preserve whitespace after saving and reopening', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].functoids.push(createMapFunctoid('f1'));
    map.pages[0].links.push({
      ...createSchemaLink('in', paths.source.customerName, 'f1'),
      targetPath: undefined,
      targetType: 'functoid' as never,
    });
    await mapper.open({ map });
    const { ui, host } = mapper;
    const dialog = ui.page.getByRole('dialog');
    await ui.functoidNode().dblclick();
    await dialog.getByRole('button', { name: 'Add input', exact: true }).click();
    const constant = dialog.getByRole('textbox', { name: 'Value for input 2', exact: true });
    const fallback = dialog.getByRole('textbox', { name: 'Fallback value for input 1', exact: true });
    for (const value of [' ', '   ', '\t', '', ' padded ']) {
      await constant.fill(value);
      await fallback.fill(value);
      if (value === ' ') {
        await constant.fill('');
        await constant.press('Space');
      }
      await expect(constant).toHaveValue(value);
      const update = host.waitForNext('update');
      await dialog.getByRole('button', { name: 'OK', exact: true }).click();
      const saved = (await update).data;
      const serializer = new BtmSerializer();
      const reopened = serializer.deserialize(serializer.serialize(saved));
      expect(reopened.pages[0].functoids[0].parameters).toMatchObject([
        { type: 'link', defaultValue: value },
        { type: 'constant', value },
      ]);
      await ui.functoidNode().dblclick();
      await expect(constant).toHaveValue(value);
      await expect(fallback).toHaveValue(value);
    }
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });

  test('cancelling functoid configuration discards edits without notifying the host', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.addFunctoid('Concatenate');
    host.clear();
    await ui.functoidNode().dblclick();
    const dialog = ui.page.getByRole('dialog');
    await dialog.getByRole('button', { name: 'Add input', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Value for input 1', exact: true }).fill('Discard this');
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await dialog.getByRole('textbox', { name: 'Label', exact: true }).fill('Discarded label');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);

    await ui.functoidNode().dblclick();
    await expect(dialog.getByRole('textbox', { name: 'Value for input 1', exact: true })).toHaveCount(0);
    await dialog.getByRole('tab', { name: 'Label and Comments', exact: true }).click();
    await expect(dialog.getByRole('textbox', { name: 'Label', exact: true })).toHaveValue('');
    await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
  });
});
