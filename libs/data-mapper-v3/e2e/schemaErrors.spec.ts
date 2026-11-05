import { resolveSchemaDependencies } from '../src/schema/schemaDependencyResolver';
import { describeSchemaLoadError, SchemaNotFoundError } from '../src/schema/schemaLoadError';
import { SchemaParser } from '../src/schema/schemaParser';
import { expect, test } from './fixtures/mapperHost';
import { createInitPayload, paths } from './fixtures/testData';

const errorCases = [
  {
    name: 'missing schema file',
    reference: 'Schemas/Missing.xsd',
    fail: async () => {
      throw new SchemaNotFoundError('Schemas/Missing.xsd');
    },
    detail: '',
  },
  {
    name: 'missing schema element',
    reference: 'Schemas/Bad.xsd',
    fail: async () => new SchemaParser().parse('<not-a-schema/>', 'Schemas/Bad.xsd'),
    detail: 'Invalid XSD: no schema root element found',
  },
  {
    name: 'missing root element',
    reference: 'Schemas/Bad.xsd',
    fail: async () => new SchemaParser().parse('<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"/>', 'Schemas/Bad.xsd'),
    detail: 'Invalid XSD: no root element found',
  },
  {
    name: 'missing selected root',
    reference: 'Schemas/Bad.xsd',
    fail: async () =>
      new SchemaParser().parse(
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Order" type="xs:string"/></xs:schema>',
        'Schemas/Bad.xsd',
        'Shipment'
      ),
    detail: "Invalid XSD: root element 'Shipment' was not found",
  },
  {
    name: 'invalid inline schema',
    reference: '',
    fail: async () => new SchemaParser().parse('<not-a-schema/>', 'Map.btm'),
    detail: 'Invalid XSD: no schema root element found',
  },
  {
    name: 'unresolved imported schema',
    reference: 'Schemas/Bad.xsd',
    fail: async () =>
      resolveSchemaDependencies(
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:import schemaLocation="Common.xsd"/></xs:schema>',
        'Schemas/Bad.xsd',
        async () => undefined,
        (_containingPath, location) => location
      ),
    detail: "Could not resolve schema dependency 'Common.xsd' from 'Schemas/Bad.xsd'",
  },
  {
    name: 'import without schemaLocation',
    reference: 'Schemas/Bad.xsd',
    fail: async () =>
      resolveSchemaDependencies(
        '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:import namespace="urn:missing"/></xs:schema>',
        'Schemas/Bad.xsd',
        async () => undefined,
        (_containingPath, location) => location
      ),
    detail: "Schema dependency in 'Schemas/Bad.xsd' does not specify schemaLocation",
  },
];

test.describe('schema load errors and recovery @p0', () => {
  for (const side of ['source', 'target'] as const) {
    for (const errorCase of errorCases) {
      test(`${side}: reports the exact ${errorCase.name} message and recovers`, async ({ mapper }) => {
        let caught: unknown;
        try {
          await errorCase.fail();
        } catch (error) {
          caught = error;
        }
        expect(caught).toBeInstanceOf(Error);
        const label = errorCase.reference || '(inline schema)';
        const expectedMessage =
          errorCase.name === 'missing schema file'
            ? `Cannot resolve the ${side} schema reference "${label}". No matching schema file was found next to the map or in the workspace.`
            : `Cannot load the ${side} schema "${label}": ${errorCase.detail}`;
        const error = describeSchemaLoadError(side, { location: errorCase.reference }, caught);
        expect(error.message).toBe(expectedMessage);
        const payload = createInitPayload({
          ...(side === 'source' ? { sourceSchema: null } : { targetSchema: null }),
          schemaErrors: { [side]: error },
        });
        await mapper.open(payload);
        const { ui, host } = mapper;
        const placeholder = ui.page.locator(`biztalk-empty-schema.${side}-tree`);
        const alert = placeholder.getByRole('alert');

        await expect(alert).toHaveText(`${expectedMessage}Load your schema file`);
        await expect(ui.tree(side)).toBeHidden();
        await expect(
          ui.treeNode(side === 'source' ? 'target' : 'source', side === 'source' ? paths.target.root : paths.source.root)
        ).toBeVisible();
        const requested = host.waitForNext('loadSchema');
        await alert.getByRole('button', { name: 'Load your schema file', exact: true }).click();
        expect(await requested).toMatchObject({ side, browse: true });
        await expect(alert).toHaveText(`${expectedMessage}Load your schema file`);
        expect(host.messages('update')).toHaveLength(0);

        const recovered = createInitPayload();
        await host.send({ type: 'schemaStateChanged', data: recovered });
        await expect(ui.treeNode(side, side === 'source' ? paths.source.root : paths.target.root)).toBeVisible();
        await expect(alert).toHaveCount(0);
        await expect(ui.page.getByRole('alert')).toHaveCount(0);
        expect(host.messages('update')).toHaveLength(0);
      });
    }
  }

  test('keeps both schema failures independent when only one side recovers', async ({ mapper }) => {
    const sourceError = describeSchemaLoadError('source', { location: 'MissingSource.xsd' }, new SchemaNotFoundError('MissingSource.xsd'));
    const targetError = describeSchemaLoadError('target', { location: 'MissingTarget.xsd' }, new SchemaNotFoundError('MissingTarget.xsd'));
    await mapper.open({
      sourceSchema: null,
      targetSchema: null,
      availableSchemas: [],
      schemaErrors: { source: sourceError, target: targetError },
    });
    const { ui, host } = mapper;
    await expect(ui.page.getByRole('alert')).toHaveCount(2);
    const payload = createInitPayload({ targetSchema: null, schemaErrors: { target: targetError } });
    await host.send({ type: 'schemaStateChanged', data: payload });

    await expect(ui.treeNode('source', paths.source.root)).toBeVisible();
    await expect(ui.page.getByRole('alert')).toHaveText(`${targetError.message}Load your schema file`);
    await ui.schemaPicker('target').click();
    await expect(ui.page.getByRole('option')).toHaveCount(4);
    await ui.page.keyboard.press('Escape');
    expect(host.messages('update')).toHaveLength(0);
  });
});
