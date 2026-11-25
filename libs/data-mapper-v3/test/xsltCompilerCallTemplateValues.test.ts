import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, type MapFunctoid, ParameterType, ScriptType } from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
const parser = new SchemaParser();
const sourceDefinition =
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
  '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
  '<xs:element name="Value" type="xs:string"/><xs:element name="Other" type="xs:string"/>' +
  '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>';
const source = parser.parse(sourceDefinition, 'source.xsd');
const target = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Result"><xs:complexType><xs:sequence>' +
    '<xs:element name="Line" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
    '<xs:element name="V" minOccurs="0"><xs:complexType><xs:sequence>' +
    '<xs:element name="Part" type="xs:string" maxOccurs="unbounded"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:sequence>' +
    '<xs:attribute name="value" type="xs:string"/><xs:attribute name="other" type="xs:string"/>' +
    '</xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'target.xsd'
);
const input = '<Root><Items><Value>A</Value><Other>one</Other></Items><Items><Value>B</Value><Other>two</Other></Items></Root>';
const namedDefinition = '<xsl:template name="AddressTemplate"><xsl:param name="id"/><xsl:value-of select="$id"/></xsl:template>';
const helperPath = path.resolve(
  __dirname,
  '..',
  'tools',
  'compiler-worker',
  'runtime',
  'win-x64',
  'framework-transform',
  'BizTalk.DataMapper.FrameworkTransform.exe'
);
// Same published .NET Framework helper as xsltLiteralEscaping.test.ts; never download or build it here.
const testDotNet = process.platform === 'win32' && existsSync(helperPath) ? test : test.skip;

function functoid(id: string, functoidId: number): MapFunctoid {
  const definition = FunctoidRegistry.getInstance().getFunctoid(functoidId)!;
  return {
    id,
    functoidId,
    category: definition.category,
    name: definition.name,
    x: 0,
    y: 0,
    inputLinks: [],
    outputLinks: [],
    parameters: [],
  };
}

function valueMap(scriptContent: string, preserveSequenceOrder: boolean, outputPath = '/Result/Line/@value'): MapDocument {
  return {
    name: 'Captured call-template values',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [
      {
        id: 'page',
        name: 'Values',
        functoids: [
          {
            ...functoid('script', 260),
            scriptType: ScriptType.InlineXsltCallTemplate,
            scriptContent,
            parameters: [{ index: 0, type: ParameterType.Link, value: 'input' }],
          },
          {
            ...functoid('loop', 424),
            parameters: [{ index: 0, type: ParameterType.Link, value: 'records' }],
          },
        ],
        links: [
          {
            id: 'records',
            sourceId: '/Root/Items',
            sourcePath: '/Root/Items',
            targetId: 'loop',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid,
          },
          {
            id: 'input',
            sourceId: '/Root/Items/Value',
            sourcePath: '/Root/Items/Value',
            targetId: 'script',
            sourceType: LinkEndpointType.SchemaNode,
            targetType: LinkEndpointType.Functoid,
          },
          // Attributes and complex containers use variable capture, unlike the raw-XSLT leaf-element output path.
          {
            id: 'output',
            sourceId: 'script',
            targetId: outputPath,
            targetPath: outputPath,
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.SchemaNode,
          },
          {
            id: 'loop-output',
            sourceId: 'loop',
            targetId: '/Result/Line',
            targetPath: '/Result/Line',
            sourceType: LinkEndpointType.Functoid,
            targetType: LinkEndpointType.SchemaNode,
          },
        ],
      },
    ],
  };
}

function compile(map: MapDocument, sourceTree = source): string {
  const result = new XsltCompiler().compile(map, sourceTree, target);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeDefined();
  return result.xslt!;
}

const elements = (root: Element, localName: string) => Array.from(root.getElementsByTagNameNS(xsltNamespace, localName));
const values = (root: Element, localName: string) =>
  Array.from(root.getElementsByTagNameNS('*', localName)).map((element) => element.textContent);
const attributes = (root: Element, name = 'value') =>
  Array.from(root.getElementsByTagNameNS('*', 'Line')).map((element) => element.getAttribute(name));

function stylesheet(xslt: string): Element {
  const root = create(xslt).root().node as Element;
  expect(root.namespaceURI).toBe(xsltNamespace);
  expect(root.localName).toBe('stylesheet');
  // Checking every descendant catches definitions nested inside other templates AND result-tree-fragment variables.
  for (const template of elements(root, 'template')) {
    expect(template.parentNode === root, `template ${template.getAttribute('name')} must be a stylesheet-root declaration`).toBe(true);
  }
  for (const variable of elements(root, 'variable')) {
    expect(elements(variable, 'template')).toHaveLength(0);
  }
  return root;
}

function capturedCalls(root: Element, name: string): Element[] {
  const calls = elements(root, 'call-template').filter((call) => call.getAttribute('name') === name);
  expect(calls.length).toBeGreaterThan(0);
  for (const call of calls) {
    const parent = call.parentNode as Element;
    expect(parent.namespaceURI).toBe(xsltNamespace);
    expect(parent.localName).toBe('variable');
    expect(elements(parent, 'template')).toHaveLength(0);
  }
  return calls;
}

function transform(xslt: string, xml = input): Element {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-call-template-values-'));
  try {
    const xsltPath = path.join(directory, 'map.xslt');
    const inputPath = path.join(directory, 'input.xml');
    const outputPath = path.join(directory, 'output.xml');
    writeFileSync(xsltPath, xslt);
    writeFileSync(inputPath, xml);
    const result = spawnSync(helperPath, [xsltPath, inputPath, outputPath], { encoding: 'utf8', timeout: 15000, windowsHide: true });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    return create(readFileSync(outputPath, 'utf8')).root().node as Element;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function expandedName(element: Element): [string | null, string] {
  const name = element.getAttribute('name')!;
  const [prefix, localName] = name.split(':');
  return localName ? [element.lookupNamespaceURI(prefix), localName] : [null, prefix];
}

describe.each([false, true])('call-template VALUE capture (preserve sequence: %s)', (preserveSequenceOrder) => {
  testDotNet('copies captured template nodes into a complex container in each current input record', () => {
    const map = valueMap(
      '<xsl:template name="AddressTemplate"><xsl:param name="id"/>' +
        "<Part><xsl:value-of select=\"concat($id, '@', local-name(), ':', Other)\"/></Part>" +
        '<Part><xsl:value-of select="Other"/></Part></xsl:template>',
      preserveSequenceOrder,
      '/Result/Line/V'
    );
    const xslt = compile(map);
    // Execute before structural checks so RED evidence includes XslCompiledTransform rejecting the nested declaration.
    const output = transform(xslt);
    const containers = Array.from(output.getElementsByTagNameNS('*', 'V'));
    expect(containers.map((container) => values(container, 'Part'))).toEqual([
      ['A@Items:one', 'one'],
      ['B@Items:two', 'two'],
    ]);
    const root = stylesheet(xslt);
    const templates = elements(root, 'template').filter((template) => template.getAttribute('name') === 'AddressTemplate');
    expect(templates).toHaveLength(1);
    for (const call of capturedCalls(root, 'AddressTemplate')) {
      expect(elements(call, 'with-param').map((parameter) => parameter.getAttribute('name'))).toEqual(['id']);
      const captureName = (call.parentNode as Element).getAttribute('name');
      expect(elements(root, 'copy-of').some((copy) => copy.getAttribute('select') === `$${captureName}`)).toBe(true);
    }
    expect(elements(root, 'template').some((template) => /^ScriptTemplate/.test(template.getAttribute('name') || ''))).toBe(false);
  });

  testDotNet('binds two distinct declared parameters in persisted input order, not graphical link order', () => {
    const map = valueMap(
      '<xsl:template name="join"><xsl:param name="first"/><xsl:param name="second"/>' +
        '<xsl:value-of select="concat($first, \'/\', $second)"/></xsl:template>',
      preserveSequenceOrder
    );
    map.pages[0].functoids[0].parameters.push({ index: 1, type: ParameterType.Link, value: 'other' });
    map.pages[0].links.unshift({
      id: 'other',
      sourceId: '/Root/Items/Other',
      sourcePath: '/Root/Items/Other',
      targetId: 'script',
      sourceType: LinkEndpointType.SchemaNode,
      targetType: LinkEndpointType.Functoid,
    });
    const xslt = compile(map);
    const root = stylesheet(xslt);
    for (const call of capturedCalls(root, 'join')) {
      expect(elements(call, 'with-param').map((parameter) => parameter.getAttribute('name'))).toEqual(['first', 'second']);
    }
    expect(attributes(transform(xslt))).toEqual(['A/one', 'B/two']);
  });

  testDotNet('deduplicates definitions shared by distinct value functoids without merging their arguments', () => {
    const map = valueMap(namedDefinition, preserveSequenceOrder);
    const page = map.pages[0];
    page.functoids.push({ ...page.functoids[0], id: 'script2', parameters: [{ index: 0, type: ParameterType.Link, value: 'input2' }] });
    page.links.push(
      { ...page.links[1], id: 'input2', sourceId: '/Root/Items/Other', sourcePath: '/Root/Items/Other', targetId: 'script2' },
      { ...page.links[2], id: 'output2', sourceId: 'script2', targetId: '/Result/Line/@other', targetPath: '/Result/Line/@other' }
    );
    const original = JSON.stringify(map);
    const xslt = compile(map);
    const root = stylesheet(xslt);
    expect(elements(root, 'template').filter((template) => template.getAttribute('name') === 'AddressTemplate')).toHaveLength(1);
    expect(capturedCalls(root, 'AddressTemplate')).toHaveLength(2);
    const output = transform(xslt);
    expect(attributes(output)).toEqual(['A', 'B']);
    expect(attributes(output, 'other')).toEqual(['one', 'two']);
    expect(JSON.stringify(map)).toBe(original);
  });

  testDotNet('retains a helper template and global key at stylesheet root for a captured value', () => {
    const map = valueMap(
      '<xsl:key name="by-value" match="Items" use="Value"/>' +
        '<xsl:template name="AddressTemplate"><xsl:param name="id"/>' +
        '<xsl:call-template name="count-matches"><xsl:with-param name="lookup" select="$id"/></xsl:call-template></xsl:template>' +
        '<xsl:template name="count-matches"><xsl:param name="lookup"/>' +
        '<xsl:value-of select="count(key(\'by-value\', $lookup))"/></xsl:template>',
      preserveSequenceOrder
    );
    const xslt = compile(map);
    const root = stylesheet(xslt);
    expect(elements(root, 'template').filter((template) => template.getAttribute('name') === 'count-matches')).toHaveLength(1);
    const keys = elements(root, 'key');
    expect(keys).toHaveLength(1);
    expect(keys[0].parentNode === root).toBe(true);
    capturedCalls(root, 'AddressTemplate');
    const duplicateInput = input.replace('</Root>', '<Items><Value>A</Value><Other>three</Other></Items></Root>');
    expect(attributes(transform(xslt, duplicateInput))).toEqual(['2', '1', '2']);
  });

  testDotNet('preserves local bindings for QName template and parameter names with an aliased XSLT prefix', () => {
    const map = valueMap(
      `<t:template xmlns:t="${xsltNamespace}" xmlns:xsl="urn:helpers" name="xsl:emit">
        <t:param xmlns:s0="urn:parameters" name="s0:id"/>
        <t:value-of xmlns:s0="urn:parameters" select="$s0:id"/>
      </t:template>`,
      preserveSequenceOrder
    );
    // Both QName bindings deliberately collide with compiler prefixes. They must not shadow the generated
    // instruction namespace or the source XPath namespace on the invocation/argument.
    const namespacedSource = parser.parse(
      sourceDefinition.replace('<xs:schema ', '<xs:schema targetNamespace="urn:source" elementFormDefault="qualified" '),
      'source.xsd'
    );
    const xslt = compile(map, namespacedSource);
    const root = stylesheet(xslt);
    const calls = elements(root, 'call-template');
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(expandedName(call)).toEqual(['urn:helpers', 'emit']);
      expect((call.parentNode as Element).localName).toBe('variable');
      const parameters = elements(call, 'with-param');
      expect(parameters).toHaveLength(1);
      expect(expandedName(parameters[0])).toEqual(['urn:parameters', 'id']);
    }
    expect(attributes(transform(xslt, input.replace('<Root>', '<Root xmlns="urn:source">')))).toEqual(['A', 'B']);
  });

  test.each([
    ['malformed XML', '<xsl:template name="broken"><xsl:param name="id"/>', /malformed XML/],
    ['missing template name', '<xsl:template><xsl:param name="id"/><xsl:text>not named</xsl:text></xsl:template>', /named xsl:template/],
    ['declarations-only key', '<xsl:key name="by-value" match="Items" use="Value"/>', /named xsl:template/],
  ])('reports %s on an attribute-producing script instead of wrapping declarations as instructions', (_name, content, message) => {
    const result = new XsltCompiler().compile(valueMap(content as string, preserveSequenceOrder), source, target);
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        elementId: 'script',
        pageId: 'page',
        pageName: 'Values',
        message: expect.stringMatching(message as RegExp),
      })
    );
    if (result.xslt) {
      const root = stylesheet(result.xslt);
      expect(elements(root, 'call-template')).toHaveLength(0);
      for (const key of elements(root, 'key')) {
        expect(key.parentNode === root).toBe(true);
      }
    }
  });

  test('reports both too few and too many inputs against the declared template arity', () => {
    for (const count of [0, 2]) {
      const map = valueMap(namedDefinition, preserveSequenceOrder);
      map.pages[0].links = map.pages[0].links.filter((link) => link.id !== 'input');
      map.pages[0].functoids[0].parameters = Array.from({ length: count }, (_, index) => ({
        index,
        type: ParameterType.Constant,
        value: `value${index}`,
      }));
      const result = new XsltCompiler().compile(map, source, target);
      expect(result.success).toBe(false);
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          elementId: 'script',
          pageId: 'page',
          pageName: 'Values',
          message: expect.stringContaining(`XSLT call-template 'AddressTemplate' expects 1 input(s), but received ${count}`),
        })
      );
      if (result.xslt) {
        expect(elements(stylesheet(result.xslt), 'call-template')).toHaveLength(0);
      }
    }
  });

  testDotNet('preserves legacy bare instruction bodies and the empty-script param0 fallback', () => {
    for (const content of ['<xsl:value-of select="concat($param0, \':legacy\')"/>', '']) {
      const xslt = compile(valueMap(content, preserveSequenceOrder));
      const root = stylesheet(xslt);
      const calls = elements(root, 'call-template');
      expect(calls.length).toBeGreaterThan(0);
      for (const call of calls) {
        expect(elements(call, 'with-param').map((parameter) => parameter.getAttribute('name'))).toEqual(['param0']);
        const definition = elements(root, 'template').find((template) => template.getAttribute('name') === call.getAttribute('name'));
        expect(definition).toBeDefined();
        expect(elements(definition!, 'param').map((parameter) => parameter.getAttribute('name'))).toEqual(['param0']);
      }
      expect(attributes(transform(xslt))).toEqual(content ? ['A:legacy', 'B:legacy'] : ['A', 'B']);
    }
  });

  test('continues rejecting unsupported script-to-functoid chains', () => {
    const map = valueMap(namedDefinition, preserveSequenceOrder);
    map.pages[0].functoids.push({
      ...functoid('format', 107),
      parameters: [
        { index: 0, type: ParameterType.Link, value: 'output' },
        { index: 1, type: ParameterType.Constant, value: '!' },
      ],
    });
    const output = map.pages[0].links.find((link) => link.id === 'output')!;
    map.pages[0].links.push({ ...output, id: 'formatted', sourceId: 'format' });
    output.targetId = 'format';
    output.targetType = LinkEndpointType.Functoid;
    output.targetPath = undefined;
    const result = new XsltCompiler().compile(map, source, target);
    expect(result.success).toBe(false);
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        elementId: 'script',
        pageId: 'page',
        pageName: 'Values',
        message: expect.stringContaining('Inline XSLT functoids may only connect directly to a target schema node'),
      })
    );
  });
});
