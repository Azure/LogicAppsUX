import { expect, test } from './fixtures/mapperHost';
import { createMap, createSchemaLink, paths } from './fixtures/testData';

test.describe('schema node linking @p0', () => {
  test('clicking a source connector then a target connector creates a link and notifies the host', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);

    await expect(ui.links).toHaveCount(1);
    await expect(ui.toolbarStatus).toContainText('Link created');
    await expect(ui.connector('source', paths.source.orderId)).toHaveClass(/connected/);
    await expect(ui.connector('target', paths.target.invoiceId)).toHaveClass(/connected/);

    expect(host.messages('update')).toHaveLength(1);
    const [link] = host.lastUpdatedMap()!.pages[0].links;
    expect(link).toMatchObject({
      sourcePath: paths.source.orderId,
      targetPath: paths.target.invoiceId,
      sourceType: 'schemaNode',
      targetType: 'schemaNode',
    });
  });

  test('can create several distinct links on one page', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);
    await ui.connectSchemaNodes(paths.source.customerName, paths.target.billToName);
    await ui.connectSchemaNodes(paths.source.customerEmail, paths.target.billToEmail);

    await expect(ui.links).toHaveCount(3);
    expect(host.lastUpdatedMap()!.pages[0].links.map((l) => l.targetPath)).toEqual([
      paths.target.invoiceId,
      paths.target.billToName,
      paths.target.billToEmail,
    ]);
  });

  test('linking the same pair twice does not create a duplicate', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);
    await expect(ui.links).toHaveCount(1);
    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);

    await expect(ui.toolbarStatus).toContainText('Link already exists');
    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(1);
  });

  test('Escape cancels a pending link so the next click starts a new one', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.connector('source', paths.source.orderId).click();
    await expect(ui.toolbarStatus).toContainText('Source: OrderId');
    await ui.page.keyboard.press('Escape');
    await expect(ui.toolbarStatus).toHaveText('');

    await ui.connector('target', paths.target.invoiceId).click();

    await expect(ui.links).toHaveCount(0);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('selecting a link and pressing Delete removes it and notifies the host', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;

    await expect(ui.link('link-1')).toHaveCount(1);
    await ui.selectLink('link-1');
    await ui.page.keyboard.press('Delete');

    await expect(ui.links).toHaveCount(0);
    await expect(ui.connector('source', paths.source.orderId)).not.toHaveClass(/connected/);
    expect(host.lastUpdatedMap()!.pages[0].links).toEqual([]);
  });

  test('status bar link count follows in-session link changes', async ({ mapper }) => {
    await mapper.open();
    const { ui } = mapper;

    await ui.connectSchemaNodes(paths.source.orderId, paths.target.invoiceId);

    await expect(ui.links).toHaveCount(1);
    await expect(ui.statusBar).toContainText('Links: 1', { timeout: 1_000 });
  });

  test('Delete with nothing selected is a no-op', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
    await mapper.open({ map });
    const { ui, host } = mapper;

    await ui.page.keyboard.press('Delete');

    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(0);
  });
});
