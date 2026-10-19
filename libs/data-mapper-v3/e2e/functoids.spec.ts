import { expect, test } from './fixtures/mapperHost';
import { createMap, createMapFunctoid, createSchemaLink, paths } from './fixtures/testData';

test.describe('functoids @p0', () => {
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
});
