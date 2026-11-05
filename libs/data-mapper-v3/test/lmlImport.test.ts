import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { planLmlImport } from '../src/lml/lmlImportPlanner';
import { planMapImport } from '../src/schema/mapImportPlanner';
import { loadMap } from '../webview/src/lml/loadMap';

const schema = '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root" type="xs:string"/></xs:schema>';

describe('LML import planning', () => {
  let directory: string;
  const write = (name: string, value: string): string => {
    const file = path.join(directory, name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, value);
    return file;
  };

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'mapper-lml-import-'));
    write('Schemas/Source.xsd', schema);
    write('Schemas/Target.xsd', schema);
  });

  afterEach(() => fs.rmSync(directory, { recursive: true, force: true }));

  test('relocates only schema header scalars and preserves repeated LML keys and comments', () => {
    const body = '# body comment\nRoot:\n  $for: /First\n  $for: /Second\n  $if: true\n  $if: false\n  value: \'"literal value"\'\n';
    const file = write('Maps/Imported.lml', `$sourceSchema: Source.xsd # source\n$targetSchema: Target.xsd\n${body}`);
    const plan = planLmlImport(file);

    expect(plan.mapContent).toBe(`$sourceSchema: "Source.xsd" # source\n$targetSchema: "Target.xsd"\n${body}`);
    const loaded = loadMap(plan.mapContent);
    expect(loaded.$sourceSchema).toBe('Source.xsd');
    expect(loaded.$targetSchema).toBe('Target.xsd');
    const root = loaded.Root as Record<string, unknown>;
    expect(Object.keys(root).filter((key) => key.endsWith('-$for'))).toHaveLength(2);
    expect(Object.keys(root).filter((key) => key.endsWith('-$if'))).toHaveLength(2);
    expect(plan.schemaFiles.map((entry) => entry.relativePath).sort()).toEqual(['Source.xsd', 'Target.xsd']);
    expect(plan.mapName).toBe('Imported');
    expect(fs.readFileSync(file, 'utf8')).toContain('$sourceSchema: Source.xsd # source');
  });

  test('uniquifies only directive keys without altering constants or expression arguments', () => {
    const loaded = loadMap(`Root:
  $if: /First
  $if: /Second
  nested:
    $for(/Root/Item):
      literal: $if
      loop: $for
      format: $format
      expression: $concat("$if", "$for", "$format")
    $for(/Root/Item):
      literal: '$if'
  $format: unchanged
`);
    const root = loaded.Root as Record<string, unknown>;
    expect(Object.keys(root).filter((key) => key.endsWith('-$if'))).toHaveLength(2);
    expect(root.$format).toBe('unchanged');
    const nested = root.nested as Record<string, unknown>;
    const loops = Object.entries(nested).filter(([key]) => key.endsWith('-$for(/Root/Item)'));
    expect(loops).toHaveLength(2);
    expect(loops[0][1]).toEqual({ literal: '$if', loop: '$for', format: '$format', expression: '$concat("$if", "$for", "$format")' });
    expect(loops[1][1]).toEqual({ literal: '$if' });
  });

  test('finds Logic Apps Artifacts schemas and copies transitive includes once', () => {
    write('LogicApp/Artifacts/Schemas/Shared.xsd', schema);
    const including = '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="Shared.xsd"/></xs:schema>';
    write('LogicApp/Artifacts/Schemas/Source.xsd', including);
    write('LogicApp/Artifacts/Schemas/Target.xsd', including);
    const file = write('LogicApp/Artifacts/MapDefinitions/Imported.lml', '$sourceSchema: Source.xsd\n$targetSchema: Target.xsd\n');

    expect(
      planLmlImport(file)
        .schemaFiles.map((entry) => entry.relativePath)
        .sort()
    ).toEqual(['Shared.xsd', 'Source.xsd', 'Target.xsd']);
  });

  test('keeps schemas with equal basenames distinct', () => {
    write('Schemas/Left/Root.xsd', schema);
    write('Schemas/Right/Root.xsd', schema);
    const file = write('Imported.lml', '$sourceSchema: Left/Root.xsd\n$targetSchema: Right/Root.xsd\n');

    expect(
      planLmlImport(file)
        .schemaFiles.map((entry) => entry.relativePath)
        .sort()
    ).toEqual(['Left/Root.xsd', 'Right/Root.xsd']);
  });

  test('copies local JSON schema references and ignores local fragments', () => {
    write(
      'Schemas/Input.json',
      JSON.stringify({ properties: { first: { $ref: 'Shared.json#/definitions/name' }, second: { $ref: '#/definitions/local' } } })
    );
    write('Schemas/Shared.json', '{"definitions":{"name":{"type":"string"}}}');
    const file = write('Imported.lml', '$sourceSchema: Input.json\n$targetSchema: Target.xsd\n');

    expect(
      planLmlImport(file)
        .schemaFiles.map((entry) => entry.relativePath)
        .sort()
    ).toEqual(['Input.json', 'Shared.json', 'Target.xsd']);
  });

  test('rejects missing roots and duplicate schema headers', () => {
    expect(() => planLmlImport(write('Missing.lml', '$sourceSchema: Missing.xsd\n$targetSchema: Target.xsd\n'))).toThrow(
      'Could not resolve'
    );
    expect(() =>
      planLmlImport(write('Duplicate.lml', '$sourceSchema: Source.xsd\n$sourceSchema: Target.xsd\n$targetSchema: Target.xsd\n'))
    ).toThrow('exactly one');
  });

  test('rejects missing and remote dependencies instead of claiming a portable import', () => {
    const file = write('Imported.lml', '$sourceSchema: Source.xsd\n$targetSchema: Target.xsd\n');
    write(
      'Schemas/Source.xsd',
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="Missing.xsd"/></xs:schema>'
    );
    expect(() => planLmlImport(file)).toThrow('could not be imported');
    write(
      'Schemas/Source.xsd',
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:include schemaLocation="https://example.test/Shared.xsd"/></xs:schema>'
    );
    expect(() => planLmlImport(file)).toThrow('External schema dependency');
  });

  test('leaves the existing BTM import path unchanged', () => {
    const file = write(
      'Existing.btm',
      '<mapsource Name="Existing"><SrcTree><Reference Location="Schemas/Source.xsd"/></SrcTree><TrgTree><Reference Location="Schemas/Target.xsd"/></TrgTree><Pages><Page Name="Page 1"/></Pages></mapsource>'
    );
    const plan = planMapImport(file);

    expect(plan.mapName).toBe('Existing');
    expect(plan.schemaFiles).toHaveLength(2);
    expect(plan.mapContent).toContain('Location="Schemas/Source.xsd"');
    expect(plan.warnings).toEqual([]);
  });

  test.each(['<xs:import namespace="urn:external"/>', '<xs:include/>', '<xs:redefine schemaLocation="Target.xsd"/>'])(
    'rejects unsupported XSD dependencies: %s',
    (dependency) => {
      write('Schemas/Source.xsd', `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">${dependency}</xs:schema>`);
      const file = write('Imported.lml', '$sourceSchema: Source.xsd\n$targetSchema: Target.xsd\n');
      expect(() => planLmlImport(file)).toThrow();
    }
  );

  test('rejects JSON base identities and absolute dependencies', () => {
    const file = write('Imported.lml', '$sourceSchema: Input.json\n$targetSchema: Target.xsd\n');
    write('Schemas/Input.json', '{"$id":"urn:input","type":"object"}');
    expect(() => planLmlImport(file)).toThrow('base identities');
    write('Schemas/Input.json', JSON.stringify({ $ref: path.join(directory, 'Schemas', 'Target.xsd') }));
    expect(() => planLmlImport(file)).toThrow('External schema dependency');
  });
});
