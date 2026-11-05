import { expect, test } from './fixtures/mapperHost';
import { createMap, createSchemaLink, paths } from './fixtures/testData';

function mapWithLinkOnPageOne() {
  const map = createMap();
  map.pages[0].links.push(createSchemaLink('link-1', paths.source.orderId, paths.target.invoiceId));
  return map;
}

test.describe('map pages @p0', () => {
  test('adding a page creates an empty second page and activates it', async ({ mapper }) => {
    await mapper.open({ map: mapWithLinkOnPageOne() });
    const { ui, host } = mapper;
    await expect(ui.links).toHaveCount(1);

    await ui.addPageButton.click();

    await expect(ui.pageTabs).toHaveCount(2);
    await expect(ui.pageTabs.nth(1)).toHaveText('Page 2');
    await expect(ui.links).toHaveCount(0);
    expect(host.lastUpdatedMap()!.pages.map((p) => p.name)).toEqual(['Page 1', 'Page 2']);
  });

  test('switching tabs shows each page own links', async ({ mapper }) => {
    await mapper.open({ map: mapWithLinkOnPageOne() });
    const { ui } = mapper;
    await ui.addPageButton.click();
    await expect(ui.links).toHaveCount(0);

    await ui.pageTabs.nth(0).click();
    await expect(ui.links).toHaveCount(1);

    await ui.pageTabs.nth(1).click();
    await expect(ui.links).toHaveCount(0);
  });

  test('double-clicking a tab renames the page', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.pageTabs.first().dblclick();
    const input = ui.page.getByRole('textbox', { name: 'Page name' });
    await input.fill('Customer details');
    await input.press('Enter');

    await expect(ui.pageTabs.first()).toHaveText('Customer details');
    expect(host.lastUpdatedMap()!.pages[0].name).toBe('Customer details');
  });

  test('Escape while renaming keeps the old name', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;

    await ui.pageTabs.first().dblclick();
    const input = ui.page.getByRole('textbox', { name: 'Page name' });
    await input.fill('Discarded');
    await input.press('Escape');

    await expect(ui.pageTabs.first()).toHaveText('Page 1');
    expect(host.messages('update')).toHaveLength(0);
  });

  test('deleting an empty page needs no confirmation', async ({ mapper }) => {
    await mapper.open();
    const { ui, host } = mapper;
    await ui.addPageButton.click();
    await expect(ui.pageTabs).toHaveCount(2);
    let dialogShown = false;
    ui.page.on('dialog', (dialog) => {
      dialogShown = true;
      dialog.dismiss().catch(() => undefined);
    });

    await ui.page.getByRole('button', { name: 'Delete Page 2' }).click();

    await expect(ui.pageTabs).toHaveCount(1);
    expect(dialogShown).toBe(false);
    expect(host.lastUpdatedMap()!.pages).toHaveLength(1);
  });

  test('deleting a page with mappings asks for confirmation and honours Cancel', async ({ mapper }) => {
    await mapper.open({ map: mapWithLinkOnPageOne() });
    const { ui, host } = mapper;
    await ui.addPageButton.click();
    await expect(ui.pageTabs).toHaveCount(2);
    host.clear();

    const messages: string[] = [];
    ui.page.once('dialog', (dialog) => {
      messages.push(dialog.message());
      dialog.dismiss().catch(() => undefined);
    });
    await ui.page.getByRole('button', { name: 'Delete Page 1' }).click();
    await expect.poll(() => messages).toEqual(['Delete page "Page 1" and all of its mappings?']);
    await expect(ui.pageTabs).toHaveCount(2);
    expect(host.messages('update')).toHaveLength(0);

    ui.page.once('dialog', (dialog) => dialog.accept().catch(() => undefined));
    await ui.page.getByRole('button', { name: 'Delete Page 1' }).click();
    await expect(ui.pageTabs).toHaveCount(1);
    await expect(ui.pageTabs.first()).toHaveText('Page 2');
    expect(host.lastUpdatedMap()!.pages.map((p) => p.name)).toEqual(['Page 2']);
  });

  test('the only page cannot be deleted', async ({ mapper }) => {
    await mapper.open();
    const { ui } = mapper;

    await expect(ui.page.getByRole('button', { name: 'Delete Page 1' })).toBeDisabled();
  });
});
