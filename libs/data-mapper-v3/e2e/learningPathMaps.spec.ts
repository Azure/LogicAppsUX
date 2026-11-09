import { BtmSerializer } from '../src/schema/btmSerializer';
import { learningPathMaps, loadLearningPathMap, originalPages } from './fixtures/learningPath';
import { expect, test } from './fixtures/mapperHost';

test.describe('BizTalk learning-path maps @learning-path', () => {
  test.skip(process.platform !== 'win32', 'The original BTM schema references use Windows paths.');

  test('includes every original map, page, link and functoid', () => {
    const pages = learningPathMaps.flatMap(originalPages);
    expect(learningPathMaps).toHaveLength(151);
    expect(pages).toHaveLength(239);
    expect(pages.flatMap((page) => page.Links?.Link ?? [])).toHaveLength(1612);
    expect(pages.flatMap((page) => page.Functoids?.Functoid ?? [])).toHaveLength(635);
  });

  for (const relativePath of learningPathMaps) {
    test(`opens, edits and reopens ${relativePath}`, async ({ mapper }) => {
      test.setTimeout(60_000);
      const pages = originalPages(relativePath);
      if (pages.length === 0) {
        const payload = await loadLearningPathMap(relativePath);
        await mapper.open(payload);
        await expect(mapper.ui.pageTabs).toHaveText(['Page 1']);
        await expect(mapper.ui.links).toHaveCount(0);
        await expect(mapper.ui.functoidNodes).toHaveCount(0);
        await expect(mapper.ui.schemaPicker('source')).toBeVisible();
        await expect(mapper.ui.schemaPicker('target')).toBeVisible();
        expect(mapper.host.messages('update')).toHaveLength(0);
        return;
      }

      const payload = await loadLearningPathMap(relativePath);
      expect(payload.map.pages.map((page) => page.name)).toEqual(pages.map((page) => page.Name));
      for (const [index, original] of pages.entries()) {
        const imported = payload.map.pages[index];
        expect(imported.links.map((link) => [link.id, link.sourceBtmPath ?? link.sourceId, link.targetBtmPath ?? link.targetId])).toEqual(
          (original.Links?.Link ?? []).map((link) => [link.LinkID, link.LinkFrom, link.LinkTo])
        );
        expect(imported.functoids.map((functoid) => [functoid.id, functoid.functoidId])).toEqual(
          (original.Functoids?.Functoid ?? []).map((functoid) => [functoid.FunctoidID, Number(functoid['Functoid-FID'])])
        );
      }

      await mapper.open(payload);
      const { ui, host } = mapper;
      await expect(ui.treeNode('source', payload.sourceSchema!.rootElement.path)).toBeVisible();
      await expect(ui.treeNode('target', payload.targetSchema!.rootElement.path)).toBeVisible();
      await expect(ui.pageTabs).toHaveText(pages.map((page) => page.Name));
      for (const side of ['source', 'target'] as const) {
        const expand = ui.tree(side).getByRole('button', { name: 'Expand all schema nodes', exact: true });
        if (await expand.count()) {
          await expand.click();
        }
      }
      for (const [index, original] of pages.entries()) {
        await ui.pageTabs.nth(index).click();
        await expect(ui.functoidNodes).toHaveCount(original.Functoids?.Functoid?.length ?? 0);
        await expect(ui.links).toHaveCount(original.Links?.Link?.length ?? 0);
      }
      expect(host.messages('update')).toHaveLength(0);

      await ui.pageTabs.first().dblclick();
      const name = ui.page.getByRole('textbox', { name: 'Page name' });
      await name.fill('Learning path regression');
      const updated = host.waitForNext('update');
      await name.press('Enter');
      const edited = (await updated).data;
      const expected = structuredClone(payload.map);
      expected.pages[0].name = 'Learning path regression';
      expect(edited).toEqual(expected);

      const serialized = new BtmSerializer().serialize(edited);
      const reopened = await loadLearningPathMap(relativePath, serialized);
      expect(reopened.map.pages.map((page) => page.name)).toEqual(expected.pages.map((page) => page.name));
      expect(reopened.map.options).toEqual(expected.options);
      expect(reopened.map.targetValues).toEqual(expected.targetValues);
      expect(reopened.map.customXsltPath).toEqual(expected.customXsltPath);
      expect(reopened.map.customExtensionXmlPath).toEqual(expected.customExtensionXmlPath);
      for (const [index, page] of expected.pages.entries()) {
        expect(reopened.map.pages[index].links.map((link) => [link.id, link.sourceId, link.targetId])).toEqual(
          page.links.map((link) => [link.id, link.sourceId, link.targetId])
        );
      }
      await mapper.open(reopened);
      await expect(ui.pageTabs).toHaveText(expected.pages.map((page) => page.name));
      await expect(ui.functoidNodes).toHaveCount(expected.pages[0].functoids.length);
      expect(reopened.map.pages.flatMap((page) => page.functoids)).toEqual(expected.pages.flatMap((page) => page.functoids));
    });
  }
});
