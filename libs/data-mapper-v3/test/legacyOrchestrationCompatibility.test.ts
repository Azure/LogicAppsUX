import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from '../e2e/fixtures/learningPath';
import { orchestrationVariableScript } from '../src/compiler/orchestrationVariableScript';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids/functoidRegistry';
import type { MapDocument } from '../src/model/mapModel';
import { BtmSerializer } from '../src/schema/btmSerializer';
import { resolveAssemblyFilePath } from '../src/schema/extensionObjectResolver';
import { readTextFileSync } from '../src/schema/schemaFileResolver';
import { SchemaParser } from '../src/schema/schemaParser';
import { normalizeSingleSourcePath } from '../src/schema/schemaPathResolver';

const require = createRequire(import.meta.url);
const { buildLearningPathHelpers } = require('./native/buildLearningPathHelpers.cjs') as {
  buildLearningPathHelpers: (root: string) => string;
};
const corpusRoot = path.resolve(__dirname, '../e2etests');
const directory = path.join('How-to-Access-Orchestration-Variables-from-Maps', 'HowToSendOrchestrationVariablesIntoMaps');
const cases = [
  ['081', path.join(directory, 'UsingFunctoid', 'OrderToSAPOrderAccessOrcVarFunctoids.btm')],
  ['082', path.join(directory, 'UsingHelperClass', 'OrderToSAPOrderAccOrcVarHC.btm')],
] as const;
const helperDll = path.join(corpusRoot, directory, 'UsingHelperClass', 'StoreValuesHelperClass.dll');
const frameworkTransform = path.resolve(
  __dirname,
  '../tools/compiler-worker/runtime/win-x64/framework-transform/BizTalk.DataMapper.FrameworkTransform.exe'
);
const windows = process.platform === 'win32';
const nativeTest = test.skipIf(!windows);
const serializer = new BtmSerializer();
const xsltNamespace = 'http://www.w3.org/1999/XSL/Transform';
const sourceNamespace = 'http://HowToSendOrchestrationVariablesIntoMaps.Order';
const targetNamespace = 'http://HowToSendOrchestrationVariablesIntoMaps.SAPOrder';

// Deliberately use a normal document, as the original public .btm.cs stylesheets do.
const sourceOrder = `<o:Order xmlns:o="${sourceNamespace}">
  <Orderheader><OrderDate>2026-10-31</OrderDate><EstimatedDeliveryDate>2026-11-12</EstimatedDeliveryDate><OrderNumber>PO-081082</OrderNumber></Orderheader>
  <CustomerDetails><Name>Customer</Name><Address>Address</Address><Id>42</Id></CustomerDetails>
  <OrderDetails><ItemDescription>Parts</ItemDescription><ItemCustomerCode>PART-17</ItemCustomerCode><TotalAmount>23</TotalAmount><UnitType>EA</UnitType></OrderDetails>
</o:Order>`;

let temporaryDirectory: string | undefined;
let runtimeDll: string;
let transformCount = 0;

beforeAll(() => {
  if (!windows) {
    return;
  }
  buildLearningPathHelpers(corpusRoot);
  expect(existsSync(frameworkTransform), 'Required Framework transform executable').toBe(true);
  temporaryDirectory = mkdtempSync(path.join(tmpdir(), 'mapper-legacy-orchestration-'));
  runtimeDll = path.join(temporaryDirectory, 'TestOrchestrationRuntime.dll');
  const source = path.join(temporaryDirectory, 'TestOrchestrationRuntime.cs');
  // Only public API shapes from the MIT learning-path helper; no BizTalk binaries or keys.
  writeFileSync(
    source,
    `using System;
namespace Microsoft.XLANGs.Core {
  public class Service {
    public static Service RootService { get; set; }
    public Array _stateMgrs;
  }
  public class Context {}
  [AttributeUsage(AttributeTargets.Field)]
  public class UserVariableAttribute : Attribute {
    public string Name { get; private set; }
    public UserVariableAttribute(string name) { Name = name; }
  }
}
namespace RegressionRuntime {
  using Microsoft.XLANGs.Core;
  public class OuterContext : Context {
    [UserVariable("varDiscountType")] private string discount = "OUTER";
    [UserVariable("OuterOnly")] private string outer = "outer-only";
  }
  public class InnerContext : Context {
    [UserVariable("varDiscountType")] private string discount = "INNER";
    [UserVariable("Number")] private int number = 17;
    [UserVariable("NullValue")] private string empty = null;
    [UserVariable("PublicOnly")] public string publicValue = "not-private";
    private string Unmarked = "not-decorated";
  }
  public class NotAContext {
    [UserVariable("varDiscountType")] private string discount = "NOT-A-CONTEXT";
  }
  public static class Setup {
    public static void Configure(string mode) {
      if (mode == "no-root") { Service.RootService = null; return; }
      Service.RootService = new Service();
      if (mode == "no-managers") return;
      Service.RootService._stateMgrs = new object[] {
        new OuterContext(), null, new InnerContext(), new NotAContext()
      };
    }
  }
}`,
    'utf8'
  );
  const compiler = ['Framework64', 'Framework']
    .map((folder) => path.join(process.env.WINDIR || 'C:\\Windows', 'Microsoft.NET', folder, 'v4.0.30319', 'csc.exe'))
    .find(existsSync);
  expect(compiler, 'Installed Framework csc is required on Windows').toBeDefined();
  execFileSync(compiler!, ['/nologo', '/target:library', `/out:${runtimeDll}`, source], { timeout: 30_000, windowsHide: true });
}, 60_000);

afterAll(() => {
  if (temporaryDirectory) {
    rmSync(temporaryDirectory, { recursive: true, force: true });
  }
  if (windows) {
    console.info(`legacyOrchestrationCompatibility: ${transformCount} successful actual .NET transforms`);
  }
});

function resolveScriptMetadata(map: MapDocument, relativePath: string): MapDocument {
  const resolved = structuredClone(map);
  const baseDirectory = path.dirname(path.join(corpusRoot, relativePath));
  for (const functoid of resolved.pages.flatMap((page) => page.functoids)) {
    for (const parameter of functoid.parameters) {
      if (parameter.type === 'assemblyPath') {
        parameter.value = resolveAssemblyFilePath(parameter.value, baseDirectory);
      }
    }
    for (const implementation of functoid.scriptImplementations || []) {
      if (implementation.assemblyPath) {
        implementation.assemblyPath = resolveAssemblyFilePath(implementation.assemblyPath, baseDirectory);
      }
    }
  }
  return resolved;
}

async function compileFixture(relativePath: string, preserveSequenceOrder = false, serializedContent?: string) {
  const payload = await loadLearningPathMap(relativePath, serializedContent);
  const original = JSON.stringify(payload);
  const map = resolveScriptMetadata(payload.map, relativePath);
  map.options.preserveSequenceOrder = preserveSequenceOrder;
  const originalCompilerInput = JSON.stringify(map);
  const result = new XsltCompiler().compile(map, payload.sourceSchema!, payload.targetSchema!);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  expect(JSON.stringify(payload), 'Compilation and path resolution must preserve source graph/order').toBe(original);
  expect(JSON.stringify(map), 'Compiler must not mutate its map argument').toBe(originalCompilerInput);
  return { payload, result };
}

function transform(xslt: string, input = sourceOrder, sidecar?: string): Element {
  const runDirectory = mkdtempSync(path.join(temporaryDirectory!, 'transform-'));
  const xsltPath = path.join(runDirectory, 'map.xslt');
  const inputPath = path.join(runDirectory, 'input.xml');
  const outputPath = path.join(runDirectory, 'output.xml');
  writeFileSync(xsltPath, xslt, 'utf8');
  writeFileSync(inputPath, input, 'utf8');
  const args = [xsltPath, inputPath, outputPath];
  if (sidecar) {
    const sidecarPath = path.join(runDirectory, 'extensions.xml');
    writeFileSync(sidecarPath, sidecar, 'utf8');
    args.push(sidecarPath);
  }
  const stdout = execFileSync(frameworkTransform, args, { timeout: 30_000, windowsHide: true, encoding: 'utf8' });
  expect(stdout).toContain('OK:');
  const output = create(readFileSync(outputPath, 'utf8')).root().node as unknown as Element;
  transformCount++;
  expect(readFileSync(inputPath, 'utf8')).toBe(input);
  return output;
}

function child(parent: Element, name: string): Element {
  const matches = Array.from(parent.childNodes).filter(
    (node): node is Element => node.nodeType === 1 && (node as Element).localName === name
  );
  expect(matches, `Exactly one ${name} child of ${parent.localName}`).toHaveLength(1);
  return matches[0];
}

function assertBusinessOutput(root: Element, discount = '') {
  expect(root.localName).toBe('SAPOrder');
  expect(root.namespaceURI).toBe(targetNamespace);
  expect(child(root, 'OrderId').textContent).toBe('PO-081082');
  expect(child(root, 'ClientId').textContent).toBe('42');
  const dates = child(root, 'Dates');
  expect(child(dates, 'OrderDate').textContent).toBe('2026-10-31');
  expect(child(dates, 'EstimatedDeliveryDate').textContent).toBe('2026-11-12');
  const processDate = child(dates, 'ProcessDate').textContent!;
  expect(processDate).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  expect(Number.isNaN(Date.parse(processDate))).toBe(false);
  expect(Math.abs(Date.now() - Date.parse(processDate))).toBeLessThan(60_000);
  const details = child(root, 'Details');
  expect(child(details, 'ItemId').textContent).toBe('PART-17');
  expect(child(details, 'Units').textContent).toBe('23');
  expect(child(details, 'UnitType').textContent).toBe('EA');
  expect(child(child(root, 'AdditionalInfo'), 'DiscountType').textContent).toBe(discount);
  expect(root.getElementsByTagName('aggregateRoot')).toHaveLength(0);
}

function xmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

function probeStylesheet(body: string, script: string, assembly?: string): string {
  return `<xsl:stylesheet version="1.0" xmlns:xsl="${xsltNamespace}" xmlns:msxsl="urn:schemas-microsoft-com:xslt"
    xmlns:userCSharp="http://schemas.microsoft.com/BizTalk/2003/userCSharp" exclude-result-prefixes="msxsl userCSharp">
    <xsl:template match="/"><Probe>${body}</Probe></xsl:template>
    <msxsl:script language="C#" implements-prefix="userCSharp">
    ${assembly ? `<msxsl:assembly href="${xmlAttribute(assembly)}"/>` : ''}<![CDATA[${script}]]></msxsl:script>
  </xsl:stylesheet>`;
}

const setupAndRetrieve = `
public string RetrieveAfterSetup(string key, string mode) {
  RegressionRuntime.Setup.Configure(mode);
  return RetrieveOrchestrationVariable(key);
}`;
const tom = (name: string, namespace?: string) =>
  `/*[local-name()='${name}'${namespace === undefined ? '' : ` and namespace-uri()='${namespace}'`}]`;
const wrappedTom = tom('<Schema>') + tom('Root') + tom('InputMessagePart_0');

describe('081/082 single-source orchestration wrapper normalization', () => {
  test('strips only the legacy wrapper from a simple matching source path', () => {
    expect(normalizeSingleSourcePath('/Root/InputMessagePart_0/Order/Orderheader/OrderNumber', 'Order')).toBe(
      '/Order/Orderheader/OrderNumber'
    );
  });

  test('preserves TOM schema sentinel and exact remaining selectors', () => {
    const suffix = tom('Order') + tom('OrderDetails') + tom('ItemCustomerCode');
    expect(normalizeSingleSourcePath(wrappedTom + suffix, 'Order')).toBe(tom('<Schema>') + suffix);
  });

  test('preserves namespace URI, positions, and attributes in qualified TOM', () => {
    const suffix = `${tom('Order', sourceNamespace)}${tom('OrderDetails', '')}[position()='2']/@*[local-name()='code' and namespace-uri()='urn:codes']`;
    expect(normalizeSingleSourcePath(wrappedTom + suffix, 'Order')).toBe(tom('<Schema>') + suffix);
  });

  test.each([
    ['/Root/InputMessagePart_1/Order/Orderheader/OrderNumber', 'Order'],
    [wrappedTom + tom('Invoice') + tom('OrderNumber'), 'Order'],
    ['/Order/Orderheader/OrderNumber', 'Order'],
  ])('does not rewrite wrong-part, root-mismatch, or normal path %s', (sourcePath, rootName) => {
    expect(normalizeSingleSourcePath(sourcePath, rootName)).toBe(sourcePath);
  });

  test('normalization is idempotent', () => {
    const normalized = normalizeSingleSourcePath(wrappedTom + tom('Order') + tom('Orderheader'), 'Order');
    expect(normalizeSingleSourcePath(normalized, 'Order')).toBe(normalized);
  });
});

describe.each(cases)('real orchestration fixture %s', (_caseNumber, relativePath) => {
  test('normalizes source endpoints but keeps original sourceBtmPath and link order', async () => {
    const payload = await loadLearningPathMap(relativePath);
    const original = serializer.deserialize(readTextFileSync(path.join(corpusRoot, relativePath))!);
    const schemaLinks = payload.map.pages.flatMap((page) => page.links).filter((link) => link.sourceType === 'schemaNode');
    expect(schemaLinks).toHaveLength(7);
    for (const link of schemaLinks) {
      expect(link.sourceId).toMatch(/^\/Order\//);
      expect(link.sourcePath).toBe(link.sourceId);
      expect(link.sourceBtmPath).toContain(tom('Root') + tom('InputMessagePart_0'));
      expect(link.sourceBtmPath).toBe(
        original.pages.flatMap((page) => page.links).find((candidate) => candidate.id === link.id)!.sourceBtmPath
      );
    }
    const saved = serializer.deserialize(serializer.serialize(payload.map));
    expect(saved.pages.flatMap((page) => page.links).map((link) => link.id)).toEqual(
      original.pages.flatMap((page) => page.links).map((link) => link.id)
    );
    // The contract retains TOM initially, not necessarily the wrapper's spelling on save.
    expect(saved.pages.flatMap((page) => page.links).map((link) => link.sourceId)).toEqual(
      original.pages.flatMap((page) => page.links).map((link) => link.sourceId)
    );
  });

  test('compiles normal source-tree lookups without mutating fixture source order', async () => {
    const { payload, result } = await compileFixture(relativePath);
    expect(payload.sourceSchema!.rootElement.name).toBe('Order');
    const links = result.compilerLinks!.filter((link) => link.sourcePath.startsWith('/Order/'));
    expect(links).toHaveLength(7);
    expect(result.xslt).not.toContain('InputMessagePart_0');
  });

  nativeTest.each([false, true])('actual .NET retains dates/header/details (preserveSequenceOrder=%s)', async (preserveSequenceOrder) => {
    const { result } = await compileFixture(relativePath, preserveSequenceOrder);
    const output = transform(result.xslt!, sourceOrder, result.extensionObjectXml);
    assertBusinessOutput(output);
    if (preserveSequenceOrder) {
      expect(
        Array.from(output.childNodes)
          .filter((node) => node.nodeType === 1)
          .map((node) => (node as Element).localName)
      ).toEqual(['OrderId', 'ClientId', 'Dates', 'Details', 'AdditionalInfo']);
    }
  });
});

test('genuine inline aggregate source keeps its Root/InputMessagePart_0 hierarchy', async () => {
  const sourcePath = '/Root/InputMessagePart_0/Order/Orderheader/OrderNumber';
  const inlineSchemaXml = `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>
    <xs:element name="InputMessagePart_0"><xs:complexType><xs:sequence><xs:element name="Order"><xs:complexType><xs:sequence>
    <xs:element name="Orderheader"><xs:complexType><xs:sequence><xs:element name="OrderNumber" type="xs:string"/></xs:sequence></xs:complexType></xs:element>
    </xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element>
    </xs:sequence></xs:complexType></xs:element></xs:schema>`;
  const { map, targetSchema } = await loadLearningPathMap(cases[0][1]);
  map.sourceSchema = { location: '', rootName: 'Root', inlineSchemaXml };
  const link = map.pages[0].links.find((candidate) => candidate.id === '2')!;
  link.sourceId = sourcePath;
  link.sourcePath = sourcePath;
  delete link.sourceBtmPath;
  map.pages[0].links = [link];
  map.pages[0].functoids = [];
  const restored = serializer.deserialize(serializer.serialize(map));
  expect(restored.sourceSchema.inlineSchemaXml).toContain('InputMessagePart_0');
  const restoredLink = restored.pages[0].links.find((candidate) => candidate.id === '2')!;
  expect(restoredLink.sourceId).toBe(sourcePath);
  expect(restoredLink.sourcePath).toBe(sourcePath);
  const sourceSchema = new SchemaParser().parse(inlineSchemaXml, 'inline-aggregate.xsd', 'Root');
  const result = new XsltCompiler().compile(restored, sourceSchema, targetSchema!);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.compilerLinks).toEqual([expect.objectContaining({ sourcePath, targetPath: '/SAPOrder/OrderId' })]);
  if (windows) {
    const aggregateInput =
      '<Root><InputMessagePart_0><Order><Orderheader><OrderNumber>AGG-17</OrderNumber></Orderheader></Order></InputMessagePart_0></Root>';
    expect(child(transform(result.xslt!, aggregateInput, result.extensionObjectXml), 'OrderId').textContent).toBe('AGG-17');
  }
});

test('081 registers the real 70002 retriever instead of an unsupported custom functoid', async () => {
  expect(FunctoidRegistry.getInstance().getFunctoid(70002)?.name).toBe('Orchestration Variable Retriever');
  const { payload, result } = await compileFixture(cases[0][1]);
  const retriever = payload.map.pages.flatMap((page) => page.functoids).find((functoid) => functoid.functoidId === 70002)!;
  expect(retriever.name).toBe('Orchestration Variable Retriever');
  expect(retriever.parameters.filter((parameter) => parameter.type === 'constant').map((parameter) => parameter.value)).toEqual([
    'varDiscountType',
  ]);
  expect(result.xslt).toContain(orchestrationVariableScript.trim());
});

test('082 resolves both assembly metadata forms on clones and leaves FQN identities unchanged', async () => {
  const payload = await loadLearningPathMap(cases[1][1]);
  const original = JSON.stringify(payload.map);
  const map = resolveScriptMetadata(payload.map, cases[1][1]);
  const functoid = map.pages.flatMap((page) => page.functoids).find((candidate) => candidate.functoidId === 260)!;
  const expectedAssembly = path.resolve(path.dirname(path.join(corpusRoot, cases[1][1])), '.\\StoreValuesHelperClass.dll');
  expect(functoid.parameters.find((parameter) => parameter.type === 'assemblyPath')!.value).toBe(expectedAssembly);
  expect(functoid.scriptImplementations!.find((implementation) => implementation.type === 'externalAssembly')!.assemblyPath).toBe(
    expectedAssembly
  );
  if (windows) {
    expect(expectedAssembly).toBe(helperDll);
  }
  expect(functoid.parameters.find((parameter) => parameter.type === 'className')!.value).toBe('StoreValuesHelperClass.StoreValues');
  expect(functoid.parameters.find((parameter) => parameter.type === 'methodName')!.value).toBe('GetDataValue');
  const identity = 'StoreValuesHelperClass, Version=1.0.0.0, Culture=neutral, PublicKeyToken=90632e179d4c3096';
  expect(resolveAssemblyFilePath(identity, corpusRoot)).toBe(identity);
  expect(JSON.stringify(payload.map)).toBe(original);
});

test('082 three BTM roundtrips preserve parameters, implementations, and business semantics', async () => {
  let { map } = await loadLearningPathMap(cases[1][1]);
  const parameters = map.pages.flatMap((page) => page.functoids).map((functoid) => functoid.parameters);
  const implementations = map.pages.flatMap((page) => page.functoids).map((functoid) => functoid.scriptImplementations);
  for (let cycle = 0; cycle < 3; cycle++) {
    const serialized = serializer.serialize(map);
    map = serializer.deserialize(serialized);
    expect(map.pages.flatMap((page) => page.functoids).map((functoid) => functoid.parameters)).toEqual(parameters);
    expect(map.pages.flatMap((page) => page.functoids).map((functoid) => functoid.scriptImplementations)).toEqual(implementations);
    const { result } = await compileFixture(cases[1][1], false, serialized);
    if (windows) {
      assertBusinessOutput(transform(result.xslt!, sourceOrder, result.extensionObjectXml));
    }
  }
});

nativeTest('reflection retriever produces XML-empty without any loaded orchestration runtime', () => {
  const xslt = probeStylesheet(
    `<Discount><xsl:value-of select="userCSharp:RetrieveOrchestrationVariable('varDiscountType')"/></Discount>`,
    orchestrationVariableScript
  );
  expect(child(transform(xslt), 'Discount').textContent).toBe('');
});

nativeTest.each(['no-root', 'no-managers'])('loaded runtime with %s still produces XML-empty', (mode) => {
  const xslt = probeStylesheet(
    `<Discount><xsl:value-of select="userCSharp:RetrieveAfterSetup('varDiscountType','${mode}')"/></Discount>`,
    orchestrationVariableScript + setupAndRetrieve,
    runtimeDll
  );
  expect(child(transform(xslt), 'Discount').textContent).toBe('');
});

nativeTest('loaded contexts prove inner-scope precedence, case sensitivity, and real 081 business output', async () => {
  const probes = [
    ['Discount', 'varDiscountType', 'INNER'],
    ['Outer', 'OuterOnly', 'outer-only'],
    ['Number', 'Number', '17'],
    ['WrongCase', 'vardiscounttype', ''],
    ['Missing', 'Missing', ''],
    ['Unmarked', 'Unmarked', ''],
    ['Public', 'PublicOnly', ''],
    ['Null', 'NullValue', ''],
  ];
  const xslt = probeStylesheet(
    probes
      .map(([element, key]) => `<${element}><xsl:value-of select="userCSharp:RetrieveAfterSetup('${key}','contexts')"/></${element}>`)
      .join(''),
    orchestrationVariableScript + setupAndRetrieve,
    runtimeDll
  );
  const output = transform(xslt);
  for (const [element, , expected] of probes) {
    expect(child(output, element).textContent, element).toBe(expected);
  }
  const { result } = await compileFixture(cases[0][1]);
  const header = '<msxsl:script language="C#" implements-prefix="userCSharp">';
  expect(result.xslt).toContain(header);
  const injected = result
    .xslt!.replace(header, `${header}<msxsl:assembly href="${xmlAttribute(runtimeDll)}"/>`)
    .replace(']]></msxsl:script>', `${setupAndRetrieve}]]></msxsl:script>`)
    .replace(/userCSharp:RetrieveOrchestrationVariable\(string\(([^)]*)\)\)/g, "userCSharp:RetrieveAfterSetup(string($1),'contexts')");
  expect(injected).toContain("userCSharp:RetrieveAfterSetup(string('varDiscountType'),'contexts')");
  assertBusinessOutput(transform(injected, sourceOrder, result.extensionObjectXml), 'INNER');
});

nativeTest('082 real helper DLL SetDataValue/GetDataValue returns seeded values on the same thread', () => {
  const script = `
public string SeedAndRead(string key, string value) {
  StoreValuesHelperClass.StoreValues.SetDataValue(key, value);
  return StoreValuesHelperClass.StoreValues.GetDataValue(key);
}
public string ReadValue(string key) {
  return StoreValuesHelperClass.StoreValues.GetDataValue(key);
}`;
  const xslt = probeStylesheet(
    `<Discount><xsl:value-of select="userCSharp:SeedAndRead('varDiscountType','LOYALTY-15')"/></Discount>
     <Again><xsl:value-of select="userCSharp:ReadValue('varDiscountType')"/></Again>
     <WrongCase><xsl:value-of select="userCSharp:ReadValue('vardiscounttype')"/></WrongCase>
     <Missing><xsl:value-of select="userCSharp:ReadValue('not-set')"/></Missing>`,
    script,
    helperDll
  );
  const output = transform(xslt);
  expect(child(output, 'Discount').textContent).toBe('LOYALTY-15');
  expect(child(output, 'Again').textContent).toBe('LOYALTY-15');
  expect(child(output, 'WrongCase').textContent).toBe('');
  expect(child(output, 'Missing').textContent).toBe('');
});
