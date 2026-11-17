import { SchemaParser } from '../src/schema/schemaParser';
import { expect, test } from './fixtures/mapperHost';
import { createMap, createSchemaLink, loadSampleMap, paths } from './fixtures/testData';

const schemaCases = [
  {
    name: 'primitive types',
    definitions: '',
    content: `<xs:complexType><xs:sequence>
      <xs:element name="Amount" type="xs:decimal"/>
      <xs:element name="Active" type="xs:boolean"/>
      <xs:element name="Created" type="xs:dateTime"/>
    </xs:sequence></xs:complexType>`,
    nodes: ['/Record/Amount', '/Record/Active', '/Record/Created'],
    propertyPath: '/Record/Amount',
    properties: ['xs:decimal', 'urn:e2e:schemas'],
  },
  {
    name: 'attributes and optional repeating elements',
    definitions: '',
    content: `<xs:complexType><xs:sequence>
      <xs:element name="Items" type="xs:string" minOccurs="0" maxOccurs="unbounded"/>
    </xs:sequence>
      <xs:attribute name="id" type="xs:int" use="required"/>
      <xs:attribute name="code" type="xs:string"/>
    </xs:complexType>`,
    nodes: ['/Record/@id', '/Record/@code', '/Record/Items'],
    propertyPath: '/Record/Items',
    properties: ['0..unbounded', 'urn:e2e:schemas'],
  },
  {
    name: 'complex inheritance and choices',
    definitions: `<xs:complexType name="Base">
      <xs:sequence><xs:element name="BaseValue" type="xs:string"/></xs:sequence>
    </xs:complexType>
    <xs:complexType name="Derived"><xs:complexContent><xs:extension base="tns:Base">
      <xs:choice><xs:element name="Email" type="xs:string"/><xs:element name="Phone" type="xs:string"/></xs:choice>
    </xs:extension></xs:complexContent></xs:complexType>`,
    content: `<xs:complexType><xs:sequence><xs:element name="Details" type="tns:Derived"/></xs:sequence></xs:complexType>`,
    nodes: ['/Record/Details/BaseValue', '/Record/Details/Email', '/Record/Details/Phone'],
    propertyPath: '/Record/Details',
    properties: ['tns:Derived', 'tns:Base'],
  },
  {
    name: 'lists unions and enumerated restrictions',
    definitions: `<xs:simpleType name="Codes"><xs:list itemType="xs:NMTOKEN"/></xs:simpleType>
    <xs:simpleType name="Identifier"><xs:union memberTypes="xs:int xs:string"/></xs:simpleType>
    <xs:simpleType name="Status"><xs:restriction base="xs:string">
      <xs:enumeration value="Open"/><xs:enumeration value="Closed"/>
    </xs:restriction></xs:simpleType>`,
    content: `<xs:complexType><xs:sequence>
      <xs:element name="Codes" type="tns:Codes"/>
      <xs:element name="Identifier" type="tns:Identifier"/>
      <xs:element name="Status" type="tns:Status"/>
    </xs:sequence></xs:complexType>`,
    nodes: ['/Record/Codes', '/Record/Identifier', '/Record/Status'],
    propertyPath: '/Record/Status',
    properties: ['enumeration', 'Open, Closed'],
  },
  {
    name: 'simple content with attributes',
    definitions: `<xs:complexType name="Price"><xs:simpleContent><xs:extension base="xs:decimal">
      <xs:attribute name="currency" type="xs:string" use="required"/>
    </xs:extension></xs:simpleContent></xs:complexType>`,
    content: `<xs:complexType><xs:sequence><xs:element name="Price" type="tns:Price"/></xs:sequence></xs:complexType>`,
    nodes: ['/Record/Price', '/Record/Price/@currency'],
    propertyPath: '/Record/Price',
    properties: ['xs:decimal', 'urn:e2e:schemas'],
  },
];

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test.describe('XSD structures and schema interactions @p0', () => {
  for (const width of [1600, 1000]) {
    test(`only scrolls schema names horizontally when expanded rows need it at ${width}px`, async ({ mapper }) => {
      await mapper.ui.page.setViewportSize({ width, height: 700 });
      const name = 'CustomerAccountBillingAddressAndDeliveryInstructionsForInternationalOrdersWithAdditionalReferenceInformation';
      const rows = Array.from({ length: 35 }, (_, index) => `<xs:element name="Field${index}" type="xs:string"/>`).join('');
      const schema = new SchemaParser().parse(
        `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Record"><xs:complexType><xs:sequence>
            ${rows}
            <xs:element name="Details"><xs:complexType><xs:sequence>
              <xs:element name="${name}" type="xs:string"/>
            </xs:sequence></xs:complexType></xs:element>
          </xs:sequence></xs:complexType></xs:element>
        </xs:schema>`,
        'Schemas/ConditionalOverflow.xsd'
      );
      schema.availableRoots = ['Record', 'AnotherRoot'];
      await mapper.open({ sourceSchema: schema, targetSchema: schema });
      await mapper.ui.page.addStyleTag({ content: 'biztalk-schema-tree { scrollbar-gutter: stable; }' });
      for (const side of ['source', 'target'] as const) {
        const tree = mapper.ui.tree(side);
        const branch = mapper.ui.treeNode(side, '/Record/Details').locator('.tree-icon.expandable');
        await expect(mapper.ui.treeNode(side, `/Record/Details/${name}`)).toHaveCount(1);
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await mapper.ui.treeNode(side, `/Record/Details/${name}`).scrollIntoViewIfNeeded();
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
        await tree.evaluate((element) => {
          element.scrollTop = 0;
        });
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await mapper.ui.page.setViewportSize({ width: width - 100, height: 700 });
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await mapper.ui.page.setViewportSize({ width, height: 700 });
        await mapper.ui.treeNode(side, `/Record/Details/${name}`).scrollIntoViewIfNeeded();
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
        await branch.click();
        expect(await tree.evaluate((element) => element.offsetWidth - element.clientWidth)).toBeGreaterThan(0);
        expect(await tree.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        const labelOffset = await mapper.ui
          .treeNode(side, '/Record/Field0')
          .locator('.node-name')
          .evaluate((element) => {
            const viewport = element.closest('biztalk-schema-tree')!;
            return element.getBoundingClientRect().left - viewport.getBoundingClientRect().left;
          });
        expect(labelOffset).toBeLessThan(80);
        await mapper.ui.treeNode(side, '/Record').locator('.tree-icon.expandable').click();
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        await tree.getByRole('button', { name: 'Expand all schema nodes', exact: true }).click();
        await expect(mapper.ui.treeNode(side, `/Record/Details/${name}`)).toHaveCount(1);
        await mapper.ui.treeNode(side, `/Record/Details/${name}`).scrollIntoViewIfNeeded();
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
        await tree.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        await branch.click();
        await expect.poll(() => tree.evaluate((element) => element.scrollWidth - element.clientWidth)).toBeLessThanOrEqual(1);
        expect(await tree.evaluate((element) => element.scrollLeft)).toBe(0);
      }
      expect(mapper.host.messages('update')).toHaveLength(0);
      await mapper.ui.page.screenshot({ path: test.info().outputPath('schema-fitting-names.png') });
    });

    test(`scrolls long schema node names horizontally without truncating at ${width}px`, async ({ mapper }) => {
      await mapper.ui.page.setViewportSize({ width, height: 700 });
      const name = 'CustomerAccountBillingAddressAndDeliveryInstructionsForInternationalOrdersWithAdditionalReferenceInformation';
      const nodePath = `/Record/Details/${name}`;
      const schema = new SchemaParser().parse(
        `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
          <xs:element name="Record"><xs:complexType><xs:sequence>
            <xs:element name="Details"><xs:complexType><xs:sequence>
              <xs:element name="${name}" type="xs:string"/>
            </xs:sequence></xs:complexType></xs:element>
          </xs:sequence></xs:complexType></xs:element>
        </xs:schema>`,
        'Schemas/LongNames.xsd'
      );
      await mapper.open({ sourceSchema: schema, targetSchema: schema });
      for (const side of ['source', 'target'] as const) {
        const tree = mapper.ui.tree(side);
        const label = mapper.ui.treeNode(side, nodePath).locator('.node-name');
        const otherTree = mapper.ui.tree(side === 'source' ? 'target' : 'source');
        const otherScrollLeft = await otherTree.evaluate((element) => element.scrollLeft);
        await expect(label).toHaveText(name);
        await expect(tree).toHaveCSS('overflow-x', 'auto');
        expect(await tree.evaluate((element) => element.scrollWidth > element.clientWidth)).toBe(true);
        for (const end of [false, true]) {
          await tree.evaluate((element, scrollToEnd) => {
            element.scrollLeft = scrollToEnd ? element.scrollWidth : 0;
          }, end);
          for (const control of [tree.locator('.schema-sticky'), mapper.ui.connector(side, nodePath)]) {
            expect(
              await control.evaluate((element) => {
                const viewport = element.closest('biztalk-schema-tree')!.getBoundingClientRect();
                const bounds = element.getBoundingClientRect();
                return bounds.left >= viewport.left - 1 && bounds.right <= viewport.right + 1;
              })
            ).toBe(true);
          }
        }
        await tree.evaluate((element) => {
          element.scrollLeft = element.scrollWidth;
        });
        expect(await tree.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
        const trailingEdgeIsVisible = await label.evaluate((element) => {
          const viewport = element.closest('biztalk-schema-tree')!;
          return element.getBoundingClientRect().right <= viewport.getBoundingClientRect().right;
        });
        expect(trailingEdgeIsVisible).toBe(true);
        expect(await otherTree.evaluate((element) => element.scrollLeft)).toBe(otherScrollLeft);
        await mapper.ui.schemaPicker(side).click();
        await expect(mapper.ui.page.getByRole('listbox')).toBeVisible();
        await mapper.ui.page.keyboard.press('Escape');
      }
      expect(mapper.host.messages('update')).toHaveLength(0);
      expect(await mapper.ui.page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const updated = mapper.host.waitForNext('update');
      await mapper.ui.connectSchemaNodes(nodePath, nodePath);
      expect((await updated).data.pages[0].links).toEqual([
        expect.objectContaining({ sourcePath: nodePath, targetPath: nodePath, sourceType: 'schemaNode', targetType: 'schemaNode' }),
      ]);
      await expect(mapper.ui.links).toHaveCount(1);
      await mapper.ui.page.screenshot({ path: test.info().outputPath('schema-horizontal-scroll.png') });
    });
  }

  for (const side of ['source', 'target'] as const) {
    for (const schemaCase of schemaCases) {
      test(`loads ${schemaCase.name} on the ${side} side and shows node properties`, async ({ mapper }) => {
        const schema = new SchemaParser().parse(
          `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:tns="urn:e2e:schemas"
            targetNamespace="urn:e2e:schemas" elementFormDefault="qualified">
            ${schemaCase.definitions}<xs:element name="Record">${schemaCase.content}</xs:element>
          </xs:schema>`,
          `Schemas/${side}.xsd`
        );
        await mapper.open(side === 'source' ? { sourceSchema: schema } : { targetSchema: schema });
        const { ui, host } = mapper;

        for (const nodePath of schemaCase.nodes) {
          await expect(ui.treeNode(side, nodePath)).toBeVisible();
        }
        if (schemaCase.name === 'attributes and optional repeating elements') {
          await expect(ui.treeNode(side, '/Record/@id').getByTitle('Required', { exact: true })).toBeVisible();
          await expect(ui.treeNode(side, '/Record/@code').getByTitle('Required', { exact: true })).toHaveCount(0);
          await expect(ui.treeNode(side, '/Record/Items').getByTitle('Repeating', { exact: true })).toBeVisible();
          await expect(ui.treeNode(side, '/Record/Items').getByTitle('Required', { exact: true })).toHaveCount(0);
        }

        await ui.treeNode(side, schemaCase.propertyPath).dblclick();
        const dialog = ui.page.getByRole('dialog');
        await expect(dialog).toContainText(schemaCase.propertyPath);
        for (const value of schemaCase.properties) {
          await expect(dialog).toContainText(value);
        }
        await dialog.getByRole('button', { name: 'Close', exact: true }).click();
        await expect(dialog).toHaveCount(0);
        expect(host.messages('update')).toHaveLength(0);
      });
    }

    test(`browsing for a ${side} schema posts a browse request`, async ({ mapper }) => {
      await mapper.open({ sourceSchema: null, targetSchema: null });
      const { ui, host } = mapper;
      const requested = host.waitForNext('loadSchema');
      await ui.schemaPicker(side).click();
      await ui.page.getByRole('option', { name: 'Add new schema...', exact: true }).click();

      expect(await requested).toMatchObject({ side, browse: true });
      expect(host.messages('update')).toHaveLength(0);
    });

    test(`changing the ${side} root requests the selected root and renders the host reply`, async ({ mapper }) => {
      test.skip(process.platform !== 'win32', 'This existing BTM sample uses Windows-style schema reference paths.');
      const payload = await loadSampleMap('SchemaReferences/07_RootNode_FileRef.btm');
      await mapper.open(payload);
      const { ui, host } = mapper;
      const requested = host.waitForNext('selectSchemaRoot');
      await ui.page.getByRole('button', { name: `Change ${side} schema root`, exact: true }).click();
      await ui.page.getByRole('menuitemradio', { name: 'Shipment', exact: true }).click();
      expect(await requested).toMatchObject({ side, rootName: 'Shipment' });

      const currentSchema = side === 'source' ? payload.sourceSchema! : payload.targetSchema!;
      const schema = new SchemaParser().parse(
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Shipment" type="xs:string"/></xs:schema>',
        currentSchema.filePath,
        'Shipment'
      );
      const map = structuredClone(payload.map);
      if (side === 'source') {
        map.sourceSchema.rootName = 'Shipment';
      } else {
        map.targetSchema.rootName = 'Shipment';
      }
      await host.send({
        type: 'schemaStateChanged',
        data: {
          map,
          sourceSchema: side === 'source' ? schema : payload.sourceSchema,
          targetSchema: side === 'target' ? schema : payload.targetSchema,
          availableSchemas: payload.availableSchemas,
        },
      });
      await expect(ui.treeNode(side, '/Shipment')).toBeVisible();
      await expect(ui.treeNode(side, side === 'source' ? '/Order' : '/Invoice')).toHaveCount(0);
      await expect(ui.treeNode(side === 'source' ? 'target' : 'source', side === 'source' ? '/Invoice' : '/Order')).toBeVisible();
    });
  }

  test('collapsing expanding and revealing linked nodes does not change the map', async ({ mapper }) => {
    const map = createMap();
    map.pages[0].links.push(createSchemaLink('link-1', paths.source.customerName, paths.target.billToName));
    await mapper.open({ map });
    const { ui, host } = mapper;
    const tree = ui.tree('source');

    await tree.getByRole('button', { name: 'Collapse all schema nodes', exact: true }).click();
    await expect(ui.treeNode('source', paths.source.root)).toBeVisible();
    await expect(ui.treeNode('source', paths.source.customerName)).toHaveCount(0);
    await tree.getByRole('button', { name: 'Expand all schema nodes', exact: true }).click();
    await expect(ui.treeNode('source', paths.source.customerName)).toBeVisible();
    await ui.treeNode('source', paths.source.customer).locator('.tree-icon.expandable').click();
    await expect(ui.treeNode('source', paths.source.customerName)).toHaveCount(0);
    await tree.getByRole('button', { name: 'Expand linked schema nodes', exact: true }).click();
    await expect(ui.connector('source', paths.source.customerName)).toBeVisible();
    await expect(ui.connector('source', paths.source.customerName)).toHaveClass(/connected/);
    await expect(ui.links).toHaveCount(1);
    expect(host.messages('update')).toHaveLength(0);
  });

  test('shows missing-schema details while keeping the other schema usable', async ({ mapper }) => {
    await mapper.open({
      sourceSchema: null,
      schemaErrors: { source: { reference: 'Schemas/Missing.xsd', message: 'Schema file could not be found' } },
    });
    const { ui, host } = mapper;

    await expect(ui.page.getByText('Schema file could not be found', { exact: false })).toBeVisible();
    await expect(ui.schemaPicker('source')).toBeVisible();
    await expect(ui.treeNode('target', paths.target.invoiceId)).toBeVisible();
    expect(host.messages('update')).toHaveLength(0);
  });
});
