import { BtmSerializer } from '../src/schema/btmSerializer';
import { expect, test } from './fixtures/mapperHost';
import { loadSampleMap } from './fixtures/testData';

test.describe('existing BTM files and schema references @p0', () => {
  test.skip(process.platform !== 'win32', 'These existing BTM samples use Windows-style schema reference paths.');

  const samples = [
    '01_FileRef_DotSlash.btm',
    '02_FileRef_BareFilename.btm',
    '03_FileRef_Subfolder.btm',
    'Maps/04_FileRef_ParentRelative.btm',
    '05_DotNetName.btm',
    '06_DotNetName_SchemaSuffix.btm',
    '07_RootNode_FileRef.btm',
    '08_RootNode_DotNetName.btm',
    '09_Inline_Source.btm',
    '10_Inline_SourceAndTarget.btm',
    '13_Import_TransitiveTarget.btm',
    '17_Import_Diamond.btm',
    '18_Import_Circular.btm',
    '19_Include_SameNamespace.btm',
    '20_Include_Chameleon.btm',
  ];

  for (const sample of samples) {
    test(`loads ${sample} and preserves its schemas and mappings after editing`, async ({ mapper }) => {
      const payload = await loadSampleMap(`SchemaReferences/${sample}`);
      await mapper.open(payload);
      const { ui, host } = mapper;

      await expect(ui.treeNode('source', '/Order/OrderId')).toBeVisible();
      await expect(ui.treeNode('target', '/Invoice/InvoiceId')).toBeVisible();
      await expect(ui.treeNode('source', '/Order/ShipTo/PostalCode')).toBeVisible();
      await expect(ui.treeNode('target', '/Invoice/BillTo/PostalCode')).toBeVisible();
      if (sample === '17_Import_Diamond.btm') {
        await ui.tree('source').getByRole('button', { name: 'Expand all schema nodes', exact: true }).click();
        await expect(ui.treeNode('source', '/Order/Related/ShipTo/PostalCode')).toBeVisible();
      }
      await expect(ui.treeNode('source', '/Shipment')).toHaveCount(0);
      await expect(ui.links).toHaveCount(5);
      await expect(ui.connector('source', '/Order/OrderId')).toHaveClass(/connected/);
      await expect(ui.connector('target', '/Invoice/InvoiceId')).toHaveClass(/connected/);

      await ui.pageTabs.first().dblclick();
      const name = ui.page.getByRole('textbox', { name: 'Page name' });
      await name.fill('Edited existing map');
      const updated = host.waitForNext('update');
      await name.press('Enter');
      const editedMap = (await updated).data;
      expect(editedMap.sourceSchema).toEqual(payload.map.sourceSchema);
      expect(editedMap.targetSchema).toEqual(payload.map.targetSchema);
      expect(editedMap.pages[0].links).toEqual(payload.map.pages[0].links);

      if (!editedMap.sourceSchema.inlineSchemaXml && !editedMap.targetSchema.inlineSchemaXml) {
        const serializer = new BtmSerializer();
        const reopened = await loadSampleMap(`SchemaReferences/${sample}`, serializer.serialize(editedMap));
        expect(reopened.map.sourceSchema).toEqual(payload.map.sourceSchema);
        expect(reopened.map.targetSchema).toEqual(payload.map.targetSchema);
        await mapper.open(reopened);
      }
      await expect(ui.pageTabs.first()).toHaveText('Edited existing map');
      await expect(ui.links).toHaveCount(5);
      await expect(ui.connector('source', '/Order/OrderId')).toHaveClass(/connected/);
    });
  }

  for (const sample of ['13_Import_TransitiveTarget.btm', '19_Include_SameNamespace.btm', '20_Include_Chameleon.btm']) {
    test(`maps a resolved address field from ${sample}`, async ({ mapper }) => {
      const payload = await loadSampleMap(`SchemaReferences/${sample}`);
      await mapper.open(payload);
      const { ui, host } = mapper;
      const sourcePath = '/Order/ShipTo/PostalCode';
      const targetPath = '/Invoice/BillTo/PostalCode';

      await expect(ui.treeNode('source', sourcePath)).toBeVisible();
      await expect(ui.treeNode('target', targetPath)).toBeVisible();
      const updated = host.waitForNext('update');
      await ui.connectSchemaNodes(sourcePath, targetPath);

      expect((await updated).data.pages[0].links).toEqual([
        ...payload.map.pages[0].links,
        expect.objectContaining({ sourcePath, targetPath, sourceType: 'schemaNode', targetType: 'schemaNode' }),
      ]);
      await expect(ui.links).toHaveCount(6);
      await expect(ui.connector('source', sourcePath)).toHaveClass(/connected/);
      await expect(ui.connector('target', targetPath)).toHaveClass(/connected/);
    });
  }

  test('loads an aggregate inline source and preserves message-part paths when relinking', async ({ mapper }) => {
    const payload = await loadSampleMap('SchemaReferences/11_Inline_Aggregate_FileParts.btm');
    await mapper.open(payload);
    const { ui, host } = mapper;

    await ui.tree('source').getByRole('button', { name: 'Collapse all schema nodes', exact: true }).click();
    await expect(ui.treeNode('source', '/Root/msgOrder/Order/OrderId')).toHaveCount(0);
    await ui.tree('source').getByRole('button', { name: 'Expand all schema nodes', exact: true }).click();
    await expect(ui.treeNode('source', '/Root/msgOrder/Order/OrderId')).toBeVisible();
    await expect(ui.treeNode('source', '/Root/msgCustomer/Customer/Name')).toBeVisible();
    await expect(ui.links).toHaveCount(5);
    await ui.selectLink('link2');
    const removed = host.waitForNext('update');
    await ui.page.keyboard.press('Delete');
    expect((await removed).data.pages[0].links).toHaveLength(4);

    const updated = host.waitForNext('update');
    await ui.connectSchemaNodes('/Root/msgCustomer/Customer/Name', '/Invoice/Customer');
    const editedMap = (await updated).data;
    expect(editedMap.pages[0].links.at(-1)).toMatchObject({
      sourcePath: '/Root/msgCustomer/Customer/Name',
      targetPath: '/Invoice/Customer',
    });
    expect(editedMap.sourceSchema).toEqual(payload.map.sourceSchema);
    await expect(ui.links).toHaveCount(5);
  });

  for (const sample of ['09_Inline_Source.btm', '10_Inline_SourceAndTarget.btm', '11_Inline_Aggregate_FileParts.btm']) {
    test(`reloads the inline schemas serialized in ${sample}`, async () => {
      const relativePath = `SchemaReferences/${sample}`;
      const payload = await loadSampleMap(relativePath);
      const serialized = new BtmSerializer().serialize(payload.map);
      const roundTripped = new BtmSerializer().deserialize(serialized);
      expect(payload.map.sourceSchema.inlineSchemaXml).toBeTruthy();
      test.fail(
        sample !== '11_Inline_Aggregate_FileParts.btm',
        'Inline schema references without imports are lost when serialized BTM files are deserialized.'
      );
      expect({
        source: !!roundTripped.sourceSchema.inlineSchemaXml,
        target: !!roundTripped.targetSchema.inlineSchemaXml,
      }).toEqual({
        source: !!payload.map.sourceSchema.inlineSchemaXml,
        target: !!payload.map.targetSchema.inlineSchemaXml,
      });
      if (sample !== '11_Inline_Aggregate_FileParts.btm') {
        return;
      }

      const reopened = await loadSampleMap(relativePath, serialized);
      expect(reopened.sourceSchema?.rootElement).toEqual(payload.sourceSchema?.rootElement);
      expect(reopened.targetSchema?.rootElement).toEqual(payload.targetSchema?.rootElement);
    });
  }

  test('loads looping functoids on separate pages and isolates deletion to the active page', async ({ mapper }) => {
    const payload = await loadSampleMap('LoopingFunctoids/LoopingFunctoids.btm');
    await mapper.open(payload);
    const { ui, host } = mapper;

    await expect(ui.pageTabs).toHaveText(['Looping and Iteration', 'Existence Looping', 'Table Looping and Extractor']);
    await expect(ui.treeNode('source', '/Root/Items').getByTitle('Repeating', { exact: true })).toBeVisible();
    await expect(ui.links).toHaveCount(5);
    await expect(ui.functoidNodes).toHaveCount(2);
    await ui.pageTabs.nth(1).click();
    await expect(ui.links).toHaveCount(3);
    await expect(ui.functoidNodes).toHaveCount(1);
    await ui.pageTabs.nth(2).click();
    await expect(ui.links).toHaveCount(5);
    await expect(ui.functoidNodes).toHaveCount(2);

    const extractor = ui.page.locator('.functoid-node[data-id="table-extractor"]');
    await extractor.click();
    await expect(extractor.locator('.functoid-body')).toHaveAttribute('stroke', '#007fd4');
    const updated = host.waitForNext('update');
    await ui.page.keyboard.press('Delete');
    const editedMap = (await updated).data;
    expect(editedMap.pages.slice(0, 2)).toEqual(payload.map.pages.slice(0, 2));
    expect(editedMap.pages[2].functoids.map((functoid) => functoid.id)).toEqual(['table-loop']);
    expect(editedMap.pages[2].links.map((link) => link.id)).toEqual(['table-loop-input', 'table-value-input', 'table-target']);
    await expect(ui.links).toHaveCount(3);
    await expect(ui.functoidNodes).toHaveCount(1);
    await ui.pageTabs.first().click();
    await expect(ui.links).toHaveCount(5);
    await expect(ui.functoidNodes).toHaveCount(2);
  });
});
