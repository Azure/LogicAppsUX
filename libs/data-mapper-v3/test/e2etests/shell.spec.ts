import { expect, test } from './fixtures/mapperHost';
import { createInitPayload, createMap, createSchemaLink, createSourceSchema, paths } from './fixtures/testData';

test.describe('shell and schemas @p0', () => {
  test('posts ready on load and renders both schema trees, palette and canvas after init', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    expect(host.messages('ready')).toHaveLength(1);
    await expect(ui.treeNode('source', paths.source.root)).toBeVisible();
    await expect(ui.treeNode('source', paths.source.customerName)).toBeVisible();
    await expect(ui.treeNode('target', paths.target.root)).toBeVisible();
    await expect(ui.treeNode('target', paths.target.billToEmail)).toBeVisible();
    await expect(ui.paletteItem('Concatenate')).toBeVisible();
    await expect(ui.statusBar).toContainText('Links: 0');
    await expect(ui.statusBar).toContainText('Functoids: 0');
    await expect(ui.pageTabs).toHaveCount(1);
  });

  test('shows schema pickers when no schemas are loaded', async ({ mapper }) => {
    await mapper.open({ sourceSchema: null, targetSchema: null });
    const { ui } = mapper;

    await expect(ui.schemaPicker('source')).toBeVisible();
    await expect(ui.schemaPicker('target')).toBeVisible();
    await expect(ui.tree('source')).toBeHidden();
    await expect(ui.tree('target')).toBeHidden();
  });

  test('choosing a schema from the picker posts loadSchema for that side', async ({ mapper }) => {
    await mapper.open({ sourceSchema: null, targetSchema: null });
    const { ui, host } = mapper;

    const posted = host.waitForNext('loadSchema');
    await ui.schemaPicker('source').click();
    await mapper.ui.page.getByRole('option', { name: /Order\.xsd/ }).click();

    const message = await posted;
    expect(message.side).toBe('source');
    expect(message.path).toBe('Schemas/Order.xsd');
    expect(message.browse).toBe(false);
  });

  test('loadSchema reply populates the tree and updates the status bar', async ({ mapper }) => {
    await mapper.open({ sourceSchema: null, targetSchema: createInitPayload().targetSchema });
    const { ui, host } = mapper;

    await host.send({ type: 'schemaLoaded', data: { side: 'source', schema: createSourceSchema(), path: 'Schemas/Order.xsd' } });

    await expect(ui.treeNode('source', paths.source.root)).toBeVisible();
    await expect(ui.statusBar).toContainText('Src: Order');
  });

  test('init with an existing link renders it and counts it in the status bar', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui } = mapper;

    await expect(ui.link('link-1')).toHaveCount(1);
    await expect(ui.statusBar).toContainText('Links: 1');
    await expect(ui.connector('source', paths.source.orderId)).toHaveClass(/connected/);
    await expect(ui.connector('target', paths.target.invoiceId)).toHaveClass(/connected/);
  });

  test('ignores malformed host messages without losing the loaded map or blocking subsequent replies', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const invalidMessages = [
      null,
      42,
      [],
      {},
      { type: 'unknown' },
      { type: 'init', data: {} },
      { type: 'compileResult', data: null },
      { type: 'schemaLoaded', data: { side: 'neither' } },
      { type: 'schemaStateChanged', data: { map: null } },
      { type: 'copilotResult', data: { success: 'yes' } },
    ];
    for (const message of invalidMessages) {
      await host.send(message as never);
      await expect(ui.links).toHaveCount(1);
      await expect(ui.pageTabs.first()).toHaveText('Page 1');
      await expect(ui.treeNode('source', paths.source.root)).toBeVisible();
    }
    expect(host.messages('update')).toHaveLength(0);
    await host.send({ type: 'compileResult', data: { success: true, xslt: '<xsl:stylesheet/>', errors: [], warnings: [] } });
    await expect(ui.notification).toContainText('Compiled');
    await expect(ui.links).toHaveCount(1);
  });
});
