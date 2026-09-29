import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, ParameterType, ScriptType } from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

interface XmlElement {
  textContent: string;
  getAttribute(name: string): string | null;
}

const {
  JSDOM,
}: {
  JSDOM: new (
    xml: string,
    options: { contentType: string }
  ) => {
    window: {
      document: { querySelectorAll(selector: string): ArrayLike<XmlElement>; querySelector(selector: string): XmlElement | null };
      close(): void;
    };
  };
} = require('jsdom');

const parser = new SchemaParser();
const source = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Source"><xs:complexType><xs:sequence>' +
    '<xs:element name="Value" type="xs:string"/></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'source.xsd'
);
const target = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Result"><xs:complexType><xs:sequence>' +
    '<xs:element name="Value" type="xs:string"/><xs:element name="Marker" type="xs:string"/></xs:sequence><xs:attribute name="code" type="xs:string"/>' +
    '</xs:complexType></xs:element></xs:schema>',
  'target.xsd'
);
const cases: [string, string][] = [
  ['""', '\'""\''],
  ["O'Brien", '"O\'Brien"'],
  ['He said "it\'s ready"', "concat('He said \"it', \"'\", 's ready\"')"],
  ['A&B <C> "D"', '\'A&B <C> "D"\''],
  ['&quot; &amp; &#10;', "'&quot; &amp; &#10;'"],
  ['', "''"],
  ['line1\nline2\tend\r', "'line1\nline2\tend\r'"],
  ['plain', "'plain'"],
];
const modes = ['target', 'schema-default', 'functoid', 'input-default', 'call-template'] as const;
type LiteralMode = (typeof modes)[number];
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
const testDotNet = process.platform === 'win32' && existsSync(helperPath) ? test : test.skip;

function compileLiteralMap(mode: LiteralMode, value: string, preserveSequenceOrder: boolean): string {
  const map: MapDocument = {
    name: 'Escaped literals',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, generateDefaultFixedNodes: true, preserveSequenceOrder },
    pages: [{ id: 'page1', name: 'Page 1', functoids: [], links: [] }],
  };
  const targetTree = structuredClone(target);
  // A mapped sibling makes schema defaults reachable in the output tree.
  map.pages[0].links.push({
    id: 'marker',
    sourceId: '/Source/Value',
    sourcePath: '/Source/Value',
    targetId: '/Result/Marker',
    targetPath: '/Result/Marker',
    sourceType: LinkEndpointType.SchemaNode,
    targetType: LinkEndpointType.SchemaNode,
  });
  if (mode === 'target') {
    map.targetValues = { '/Result/Value': value, '/Result/@code': value };
  } else if (mode === 'schema-default') {
    targetTree.rootElement.children[0].defaultValue = value;
    targetTree.rootElement.attributes[0].fixedValue = value;
  } else {
    const definition = FunctoidRegistry.getInstance().getFunctoid(mode === 'call-template' ? 260 : 107)!;
    map.pages[0].functoids.push({
      id: 'f1',
      functoidId: definition.id,
      name: definition.name,
      category: definition.category,
      x: 0,
      y: 0,
      inputLinks: mode === 'input-default' ? ['input'] : [],
      outputLinks: ['output'],
      parameters:
        mode === 'input-default'
          ? [{ index: 0, type: ParameterType.Link, value: 'input', defaultValue: value }]
          : [{ index: 0, type: ParameterType.Constant, value }],
      ...(mode === 'call-template'
        ? {
            scriptType: ScriptType.InlineXsltCallTemplate,
            scriptContent:
              '<xsl:template name="emit"><xsl:param name="value"/><Value><xsl:value-of select="$value"/></Value></xsl:template>',
          }
        : {}),
    });
    if (mode === 'input-default') {
      map.pages[0].links.push({
        id: 'input',
        sourceId: '/Source/Value',
        sourcePath: '/Source/Value',
        targetId: 'f1',
        sourceType: LinkEndpointType.SchemaNode,
        targetType: LinkEndpointType.Functoid,
      });
    }
    map.pages[0].links.push({
      id: 'output',
      sourceId: 'f1',
      targetId: '/Result/Value',
      targetPath: '/Result/Value',
      sourceType: LinkEndpointType.Functoid,
      targetType: LinkEndpointType.SchemaNode,
    });
  }
  const result = new XsltCompiler().compile(map, source, mode === 'call-template' ? undefined : targetTree);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  return result.xslt!;
}

describe.each([false, true])('XML-safe literals (preserve sequence: %s)', (preserveSequenceOrder) => {
  describe.each(modes)('%s', (mode) => {
    test.each(cases)('preserves the XPath literal for %j', (value, literal) => {
      const stylesheet = new JSDOM(compileLiteralMap(mode, value, preserveSequenceOrder), { contentType: 'text/xml' });
      try {
        const expressions = Array.from(stylesheet.window.document.querySelectorAll('[select]')).map((node) => node.getAttribute('select')!);
        if (mode !== 'input-default' || value !== '') {
          expect(expressions.some((expression) => expression.includes(literal))).toBe(true);
        }
      } finally {
        stylesheet.window.close();
      }
    });

    // Requires the Windows transform helper built by publish:framework-transform.
    testDotNet.each(cases)('.NET transformation preserves %j', (value) => {
      const directory = mkdtempSync(path.join(tmpdir(), 'mapper-xslt-literal-'));
      try {
        const xsltPath = path.join(directory, 'map.xslt');
        const inputPath = path.join(directory, 'input.xml');
        const outputPath = path.join(directory, 'output.xml');
        writeFileSync(xsltPath, compileLiteralMap(mode, value, preserveSequenceOrder));
        writeFileSync(inputPath, '<Source><Value/></Source>');
        const result = spawnSync(helperPath, [xsltPath, inputPath, outputPath], { encoding: 'utf8', timeout: 15000, windowsHide: true });
        expect(result.error).toBeUndefined();
        expect(result.stderr).toBe('');
        expect(result.status).toBe(0);
        const output = new JSDOM(readFileSync(outputPath, 'utf8'), { contentType: 'text/xml' });
        try {
          // The XML output writer normalizes line endings in element text.
          expect(output.window.document.querySelector('Value')?.textContent).toBe(value.replace(/\r\n?/g, '\n'));
          if (mode === 'target' || mode === 'schema-default') {
            expect(output.window.document.querySelector('Result')?.getAttribute('code')).toBe(value);
          }
        } finally {
          output.window.close();
        }
      } finally {
        rmSync(directory, { recursive: true, force: true });
      }
    });
  });
});
