import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap, originalPages } from './e2etests/fixtures/learningPath';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids/functoidRegistry';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, ParameterType } from '../src/model';
import { SchemaParser } from '../src/schema/schemaParser';

const helper = path.resolve(
  __dirname,
  '..',
  'tools',
  'compiler-worker',
  'runtime',
  'win-x64',
  'framework-transform',
  'BizTalk.DataMapper.FrameworkTransform.exe'
);
const testTransform = process.platform === 'win32' && existsSync(helper) ? test : test.skip;
const inputNamespace = 'http://LoopingPattern.InputSchema';
const valueMappingMap = path.join('Looping-Pattern', 'LoopingPattern', 'LoopValueMappingFunctoid', 'LoopingMap.btm');
const flatteningMap = path.join('Looping-Pattern', 'LoopingPattern', 'LoopValueMappingFlatteningFunctoid', 'LoppingFlatMap.btm');
const loopMaps = [
  { relativePath: valueMappingMap, namespace: 'http://LoopingPattern.OutputSchema', emptyRecordCount: 0 },
  { relativePath: flatteningMap, namespace: inputNamespace, emptyRecordCount: 1 },
];

async function compile(relativePath: string, preserveSequenceOrder: boolean): Promise<string> {
  const payload = await loadLearningPathMap(relativePath);
  payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
  const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  return result.xslt!;
}

function transformXml(xslt: string, input: string): string {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-learning-path-empty-output-'));
  try {
    const xsltFile = path.join(directory, 'map.xslt');
    const inputFile = path.join(directory, 'input.xml');
    const outputFile = path.join(directory, 'output.xml');
    writeFileSync(xsltFile, xslt);
    writeFileSync(inputFile, input);
    const result = spawnSync(helper, [xsltFile, inputFile, outputFile], {
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
    return readFileSync(outputFile, 'utf8');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function transform(xslt: string, input: string): Document {
  const output = transformXml(xslt, input);
  expect(output.trim(), 'The real .NET transform must emit an XML root, not an empty output').not.toBe('');
  return create(output).node as unknown as Document;
}

function assertRoot(output: Document, localName: string, namespace: string): Element {
  const root = output.documentElement;
  expect(root).not.toBeNull();
  expect(root.localName).toBe(localName);
  expect(root.namespaceURI).toBe(namespace);
  expect(output.getElementsByTagNameNS(namespace, localName).length).toBe(1);
  return root;
}

function assertRecords(output: Document, namespace: string, expected: Record<string, string>[]): void {
  const root = assertRoot(output, 'Root', namespace);
  // Nested element namespace parity is intentionally outside this regression's scope.
  const records = Array.from(root.getElementsByTagNameNS('*', 'Record'));
  expect(records.length).toBe(expected.length);
  expect(Array.from(root.childNodes).filter((node) => node.nodeType === 1).length).toBe(expected.length);
  expect(root.textContent).toBe('');
  for (const [index, record] of records.entries()) {
    expect(record.parentNode).toBe(root);
    expect(record.childNodes.length).toBe(0);
    const attributes = Array.from(record.attributes).filter((attribute) => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/');
    expect(Object.fromEntries(attributes.map((attribute) => [attribute.name, attribute.value]))).toEqual(expected[index]);
    for (const attribute of attributes) {
      expect(attribute.namespaceURI ?? '').toBe('');
      expect(attribute.value).not.toBe('');
      expect(Number(attribute.value)).toBe(Number(expected[index][attribute.name]));
    }
  }
}

function loopInput(records: string): string {
  // Record/Field and Name/Value are unqualified despite the qualified source root.
  return `<s:Root xmlns:s="${inputNamespace}">${records}</s:Root>`;
}

const mixedRecords = [
  '<Record><Field Name="Other" Value="99"/><Field Name="Param2" Value="0007"/>',
  '<Field Name="Param1" Value="42"/><Field Name="Param3" Value="65535"/></Record>',
  '<Record><Field Name="Unmatched" Value="88"/></Record>',
  '<Record><Field Name="Other" Value="77"/><Field Name="Param1" Value="9"/><Field Name="Param3" Value="0"/></Record>',
].join('');

describe.each([false, true])('Learning Path empty-output regressions (preserve sequence: %s)', (preserveSequenceOrder) => {
  testTransform('MAP11 emits only the unconditional SAPOrder root for an aggregate source with no map links', async () => {
    const relativePath = path.join(
      'How-to-Access-Orchestration-Variables-from-Maps',
      'HowToSendOrchestrationVariablesIntoMaps',
      'MAP11.btm'
    );
    const pages = originalPages(relativePath);
    expect(pages.length).toBeGreaterThan(0);
    expect(pages.flatMap((page) => page.Links?.Link ?? [])).toEqual([]);
    expect(pages.flatMap((page) => page.Functoids?.Functoid ?? [])).toEqual([]);
    const xslt = await compile(relativePath, preserveSequenceOrder);
    const input = [
      '<a:Root xmlns:a="http://schemas.microsoft.com/BizTalk/2003/aggschema">',
      '<InputMessagePart_0><o:Order xmlns:o="http://HowToSendOrchestrationVariablesIntoMaps.Order">',
      '<Orderheader><OrderDate>2026-01-01</OrderDate><EstimatedDeliveryDate>2026-01-02</EstimatedDeliveryDate>',
      '<OrderNumber>Order1</OrderNumber></Orderheader>',
      '<CustomerDetails><Name>Customer</Name><Address>Address</Address><Id>1</Id></CustomerDetails>',
      '<OrderDetails><ItemDescription>Item</ItemDescription><ItemCustomerCode>Code</ItemCustomerCode>',
      '<TotalAmount>2</TotalAmount><UnitType>Each</UnitType></OrderDetails>',
      '</o:Order></InputMessagePart_0>',
      '<InputMessagePart_1><s:Support xmlns:s="http://HowToSendOrchestrationVariablesIntoMaps.OrchestrationSupport">',
      '<HasDiscount>false</HasDiscount><DiscountType>None</DiscountType></s:Support></InputMessagePart_1>',
      '</a:Root>',
    ].join('');
    const root = assertRoot(transform(xslt, input), 'SAPOrder', 'http://HowToSendOrchestrationVariablesIntoMaps.SAPOrder');
    expect(root.childNodes.length).toBe(0);
    expect(Array.from(root.attributes).filter((attribute) => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')).toEqual([]);
  });

  testTransform('LoopingMap emits one Record per Field with only its matching Value Mapping375 attribute', async () => {
    const xslt = await compile(valueMappingMap, preserveSequenceOrder);
    assertRecords(transform(xslt, loopInput(mixedRecords)), 'http://LoopingPattern.OutputSchema', [
      {},
      { Param2: '0007' },
      { Param1: '42' },
      { Param3: '65535' },
      {},
      {},
      { Param1: '9' },
      { Param3: '0' },
    ]);
  });

  testTransform('LoppingFlatMap flattens later matching Field values into each explicitly looped Record without leakage', async () => {
    const xslt = await compile(flatteningMap, preserveSequenceOrder);
    assertRecords(transform(xslt, loopInput(mixedRecords)), inputNamespace, [
      { Param1: '42', Param2: '0007', Param3: '65535' },
      {},
      { Param1: '9', Param3: '0' },
    ]);
  });

  testTransform('both looping maps retain the root for no Records and do not fabricate attributes for an empty Record', async () => {
    for (const { relativePath, namespace, emptyRecordCount } of loopMaps) {
      const xslt = await compile(relativePath, preserveSequenceOrder);
      assertRecords(transform(xslt, loopInput('')), namespace, []);
      assertRecords(
        transform(xslt, loopInput('<Record/>')),
        namespace,
        Array.from({ length: emptyRecordCount }, () => ({}))
      );
    }
  });

  testTransform('a Value Mapping linked directly to the root still intentionally filters false and emits true', () => {
    const parser = new SchemaParser();
    const source = parser.parse(
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Source" type="xs:string"/></xs:schema>',
      'source'
    );
    const target = parser.parse(
      '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="urn:root-gating">' +
        '<xs:element name="Result" type="xs:string"/></xs:schema>',
      'target'
    );
    const definition = FunctoidRegistry.getInstance().getFunctoid(375)!;
    for (const enabled of [false, true]) {
      const map: MapDocument = {
        name: 'Explicit root gating',
        version: '1',
        sourceSchema: { location: '' },
        targetSchema: { location: '' },
        options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder, omitXmlDeclaration: true },
        pages: [
          {
            id: 'page1',
            name: 'Page 1',
            links: [
              {
                id: 'root-output',
                sourceId: 'valueMap',
                targetId: '/Result',
                targetPath: '/Result',
                sourceType: LinkEndpointType.Functoid,
                targetType: LinkEndpointType.SchemaNode,
              },
            ],
            functoids: [
              {
                id: 'valueMap',
                functoidId: definition.id,
                category: definition.category,
                name: definition.name,
                x: 0,
                y: 0,
                inputLinks: [],
                outputLinks: [],
                parameters: [
                  { index: 0, value: String(enabled), type: ParameterType.Constant },
                  { index: 1, value: 'allowed', type: ParameterType.Constant },
                ],
              },
            ],
          },
        ],
      };
      const result = new XsltCompiler().compile(map, source, target);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      const output = transformXml(result.xslt!, '<Source>input</Source>');
      if (enabled) {
        const root = assertRoot(create(output).node as unknown as Document, 'Result', 'urn:root-gating');
        expect(root.textContent).toBe('allowed');
      } else {
        expect(output.trim(), 'An explicit false condition on the root must still suppress the entire output').toBe('');
      }
    }
  });
});
