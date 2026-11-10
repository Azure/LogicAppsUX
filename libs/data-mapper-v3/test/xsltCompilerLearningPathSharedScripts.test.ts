import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from './e2etests/fixtures/learningPath';
import { createMap, createMapFunctoid, type InitPayload } from './e2etests/fixtures/testData';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidCategory, LinkEndpointType, type MapDocument, type MapPage, ParameterType, ScriptType } from '../src/model';
import { BtmSerializer } from '../src/schema/btmSerializer';
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
// A missing packaged helper on Windows must fail, not silently remove native coverage.
const testTransform = test.skipIf(process.platform !== 'win32');
const case072 = path.join(
  'How-To-Reuse-Scripting-Functoids-with-Inline-Csharp',
  'MapTipsHowToReuseScriptingFunctoids',
  'MappingMultipleDates',
  'DifferentScriptingFunctoidWithTheSameNameOk.btm'
);
const case084 = path.join(
  'How-to-create-a-Global-Inline-Csharp-Function',
  'MapTipsDifferenWayToReuseScriptingFunctoids',
  'MappingMultipleDates',
  'DifferentWayReuseScriptingFunctoid.btm'
);
const dateSignature = 'public string FormatDate(string inputDate, string inputFormat, string outputFormat)';
const dateBody = `${dateSignature}
{
    return System.DateTime.ParseExact(inputDate, inputFormat, System.Globalization.CultureInfo.InvariantCulture)
        .ToString(outputFormat, System.Globalization.CultureInfo.InvariantCulture);
}`;
const zeroBody = 'public string FormatDate() { return "zero-argument-overload"; }';
const decimalSignature = 'public string ChangeDecimalSeparator(string inputDate)';
const decimalBody = `${decimalSignature} { return inputDate.Replace(",", "."); }`;

function transform(xslt: string, input: string): Element {
  expect(existsSync(helper), 'Packaged Windows .NET FrameworkTransform helper is required').toBe(true);
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-learning-path-shared-scripts-'));
  try {
    const xsltFile = path.join(directory, 'map.xslt');
    const inputFile = path.join(directory, 'input.xml');
    const outputFile = path.join(directory, 'output.xml');
    writeFileSync(xsltFile, xslt, 'utf8');
    writeFileSync(inputFile, input, 'utf8');
    const result = spawnSync(helper, [xsltFile, inputFile, outputFile], {
      encoding: 'utf8',
      timeout: 15000,
      windowsHide: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr || result.stdout).toBe(0);
    expect(result.stderr).toBe('');
    const output = readFileSync(outputFile, 'utf8');
    expect(output.trim(), 'Transformation must produce nonempty well-formed XML').not.toBe('');
    return create(output).root().node as Element;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function text(root: Element, name: string, namespace = '*'): string {
  const elements = root.getElementsByTagNameNS(namespace, name);
  expect(elements.length, `Exactly one ${name} output element is required`).toBe(1);
  return elements[0].textContent ?? '';
}

function compiled(payload: Pick<InitPayload, 'map' | 'sourceSchema' | 'targetSchema'>): string {
  const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  return result.xslt!;
}

function scriptText(xslt: string): string {
  const document = create(xslt).node as unknown as Document;
  const scripts = document.getElementsByTagNameNS('urn:schemas-microsoft-com:xslt', 'script');
  return Array.from(scripts)
    .filter((script) => script.getAttribute('implements-prefix') === 'userCSharp')
    .map((script) => script.textContent ?? '')
    .join('\n');
}

function orderInput(namespace: string, orderDate: string, deliveryDate = '20261231', total = '1234,50', discount = '7,25'): string {
  const root = create().ele('s:Order', { 'xmlns:s': namespace });
  const header = root.ele('OrderHeader');
  header.ele('OrderDate').txt(orderDate);
  header.ele('EstimatedDeliveryDate').txt(deliveryDate);
  header.ele('OrderNumber').txt('ORDER-072-084');
  const customer = root.ele('CustomDetails');
  customer.ele('Name').txt('Regression customer');
  customer.ele('Address').txt('Regression address');
  const item = root.ele('OrderDetail').ele('Item');
  item.ele('ItemDescription').txt('Regression item');
  item.ele('ItemCustomerCode').txt('ITEM-084');
  item.ele('TotalAmount').txt(total);
  item.ele('UnitType').txt('EA');
  item.ele('Discount').txt(discount);
  item.ele('NumberItems').txt('3');
  // The portable source schemas qualify only the root.
  return root.end({ headless: true });
}

function expectCurrentDate(value: string, before: Date, after: Date): void {
  expect(value.trim()).not.toBe('');
  // DateTime.Now.ToString() follows Windows culture. Compare numeric date components
  // in either day/month order, allowing a midnight crossing, not an exact clock value.
  const dateParts = value.match(/\d+/g)?.map(Number) ?? [];
  const candidates = [before, after];
  expect(
    candidates.some((date) => {
      const day = date.getDate();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      return [
        [day, month, year],
        [month, day, year],
        [year, month, day],
      ].some((parts) => parts.every((part, index) => dateParts[index] === part));
    }),
    `Zero-argument FormatDate must return a current local date, received ${value}`
  ).toBe(true);
}

interface ScriptCall {
  id: string;
  body: string;
  target?: string;
  inputs?: string[];
}

function scriptPage(name: string, calls: ScriptCall[]): MapPage {
  const links: MapPage['links'] = calls
    .filter((call) => call.target)
    .map((call) => ({
      id: `${call.id}-out`,
      sourceId: call.id,
      targetId: `/Root/${call.target}`,
      targetPath: `/Root/${call.target}`,
      sourceType: LinkEndpointType.Functoid,
      targetType: LinkEndpointType.SchemaNode,
    }));
  return {
    id: name,
    name,
    links,
    functoids: calls.map((call) =>
      createMapFunctoid(call.id, {
        functoidId: 260,
        category: FunctoidCategory.Advanced,
        name: 'Scripting',
        scriptType: ScriptType.InlineCSharp,
        scriptContent: call.body,
        scriptImplementations: [{ type: ScriptType.InlineCSharp, content: call.body }],
        outputLinks: call.target ? [`${call.id}-out`] : [],
        parameters: (call.inputs ?? []).map((value, index) => ({ index, type: ParameterType.Constant, value })),
      })
    ),
  };
}

function synthetic(pages: MapPage[]): Pick<InitPayload, 'map' | 'sourceSchema' | 'targetSchema'> {
  const map = createMap({
    name: 'Shared script regression',
    sourceSchema: { location: '', rootName: 'Root' },
    targetSchema: { location: '', rootName: 'Root' },
    pages,
  });
  map.options.generateDefaultFixedNodes = false;
  // Exercise the same script implementations and parameter representation as BTM fixtures.
  const serializer = new BtmSerializer();
  const roundTripped: MapDocument = serializer.deserialize(serializer.serialize(map));
  const parser = new SchemaParser();
  const sourceSchema = parser.parse(
    '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"/></xs:schema>',
    'source'
  );
  const targetSchema = parser.parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>
      ${['Date', 'Clock', 'Left', 'Right'].map((name) => `<xs:element name="${name}" type="xs:string" minOccurs="0"/>`).join('')}
    </xs:sequence></xs:complexType></xs:element></xs:schema>`,
    'target'
  );
  return { map: roundTripped, sourceSchema, targetSchema };
}

describe('Learning Path shared inline C# scripts: cases072 and084', () => {
  test('loads case072 as two complete FormatDate overloads without changing the fixture', async () => {
    const payload = await loadLearningPathMap(case072);
    expect(payload.sourceSchema?.rootElement.name).toBe('Order');
    expect(payload.targetSchema?.rootElement.name).toBe('SAPOrder');
    const bodies = payload.map.pages.flatMap((page) => page.functoids.map((functoid) => functoid.scriptContent ?? ''));
    expect(bodies).toHaveLength(2);
    expect(bodies.some((body) => body.includes(dateSignature) && body.includes('TryParseExact'))).toBe(true);
    expect(bodies.some((body) => body.includes('public string FormatDate()') && body.includes('System.DateTime.Now'))).toBe(true);
  });

  test('loads case084 unlinked global bodies and four signature-only references', async () => {
    const payload = await loadLearningPathMap(case084);
    const globals = payload.map.pages.find((page) => page.name === 'GlobalFunctions');
    expect(globals).toBeDefined();
    expect(globals!.links).toEqual([]);
    expect(globals!.functoids).toHaveLength(2);
    expect(globals!.functoids.every((functoid) => functoid.outputLinks.length === 0 && functoid.scriptContent?.includes('{'))).toBe(true);
    const references = payload.map.pages
      .filter((page) => page.name !== 'GlobalFunctions')
      .flatMap((page) => page.functoids.map((functoid) => functoid.scriptContent));
    expect(references.filter((body) => body === dateSignature)).toHaveLength(2);
    expect(references.filter((body) => body === decimalSignature)).toHaveLength(2);
  });

  testTransform.each([
    ['20261106', '06/11/2026'],
    ['20240229', '29/02/2024'],
  ])('case072 transforms dated input %s with the three-string overload', async (inputDate, expectedDate) => {
    const payload = await loadLearningPathMap(case072);
    const output = transform(compiled(payload), orderInput(payload.sourceSchema!.targetNamespace!, inputDate));
    expect(output.localName).toBe('SAPOrder');
    expect(output.namespaceURI).toBe(payload.targetSchema!.targetNamespace);
    expect(text(output, 'OrderDate', payload.targetSchema!.targetNamespace)).toBe(expectedDate);
    expect(text(output, 'EstimatedDeliveryDate', payload.targetSchema!.targetNamespace).trim()).not.toBe('');
  });

  testTransform('case072 executes the zero-argument overload with a current-date-compatible result', async () => {
    const payload = await loadLearningPathMap(case072);
    const xslt = compiled(payload);
    const before = new Date();
    const output = transform(xslt, orderInput(payload.sourceSchema!.targetNamespace!, '20260115'));
    const after = new Date();
    expect(text(output, 'OrderDate')).toBe('15/01/2026');
    expectCurrentDate(text(output, 'EstimatedDeliveryDate'), before, after);
    const code = scriptText(xslt);
    expect(code.match(/public\s+string\s+FormatDate\s*\(/g)).toHaveLength(2);
  });

  testTransform.each([
    ['20261106', '20261231', '1234,50', '7,25', '06/11/2026', '31/12/2026', '1234.50', '7.25'],
    ['20240229', '20240301', '-10,05', '0,00', '29/02/2024', '01/03/2024', '-10.05', '0.00'],
  ])(
    'case084 executes shared date and decimal bodies for %s / %s',
    async (date, delivery, total, discount, expectedDate, expectedDelivery, expectedTotal, expectedDiscount) => {
      const payload = await loadLearningPathMap(case084);
      const xslt = compiled(payload);
      const output = transform(xslt, orderInput(payload.sourceSchema!.targetNamespace!, date, delivery, total, discount));
      expect(output.localName).toBe('SAPOrder');
      expect(output.namespaceURI).toBe(payload.targetSchema!.targetNamespace);
      expect(text(output, 'OrderDate')).toBe(expectedDate);
      expect(text(output, 'EstimatedDeliveryDate')).toBe(expectedDelivery);
      expect(text(output, 'Total')).toBe(expectedTotal);
      expect(text(output, 'Discount')).toBe(expectedDiscount);
      expect(text(output, 'OrderID')).toBe('ORDER-072-084');
      expect(text(output, 'ClientId')).toBe('Regression customer');
      expect(text(output, 'ItemId')).toBe('ITEM-084');
      expect(output.getElementsByTagNameNS('*', 'Item')).toHaveLength(1);
      const code = scriptText(xslt);
      expect(code.match(/public\s+string\s+FormatDate\s*\(/g)).toHaveLength(1);
      expect(code.match(/public\s+string\s+ChangeDecimalSeparator\s*\(/g)).toHaveLength(1);
    }
  );

  testTransform.each([false, true])('retains both method overloads (zero-argument declaration first: %s)', (zeroFirst) => {
    const calls: ScriptCall[] = [
      { id: 'dated', body: dateBody, target: 'Date', inputs: ['20240229', 'yyyyMMdd', 'dd/MM/yyyy'] },
      { id: 'clock', body: zeroBody, target: 'Clock' },
    ];
    const payload = synthetic([scriptPage('Overloads', zeroFirst ? calls.reverse() : calls)]);
    const xslt = compiled(payload);
    const output = transform(xslt, '<Root/>');
    expect(text(output, 'Date')).toBe('29/02/2024');
    expect(text(output, 'Clock')).toBe('zero-argument-overload');
    expect(scriptText(xslt).match(/public\s+string\s+FormatDate\s*\(/g)).toHaveLength(2);
  });

  testTransform.each([false, true])('resolves unlinked full declarations (global page first: %s)', (globalFirst) => {
    const globals = scriptPage('GlobalFunctions', [
      { id: 'date-global', body: dateBody },
      { id: 'decimal-global', body: decimalBody },
    ]);
    const references = scriptPage('References', [
      { id: 'date-ref', body: dateSignature, target: 'Date', inputs: ['20261231', 'yyyyMMdd', 'dd/MM/yyyy'] },
      { id: 'decimal-ref', body: `${decimalSignature};`, target: 'Left', inputs: ['19,75'] },
    ]);
    const payload = synthetic(globalFirst ? [globals, references] : [references, globals]);
    const xslt = compiled(payload);
    const output = transform(xslt, '<Root/>');
    expect(text(output, 'Date')).toBe('31/12/2026');
    expect(text(output, 'Left')).toBe('19.75');
    const code = scriptText(xslt);
    expect(code.match(/public\s+string\s+FormatDate\s*\(/g)).toHaveLength(1);
    expect(code.match(/public\s+string\s+ChangeDecimalSeparator\s*\(/g)).toHaveLength(1);
  });

  testTransform('deduplicates identical full signatures reused by two linked functoids', () => {
    const payload = synthetic([
      scriptPage('Repeated declarations', [
        { id: 'left', body: decimalBody, target: 'Left', inputs: ['1,25'] },
        { id: 'right', body: decimalBody, target: 'Right', inputs: ['9,50'] },
      ]),
    ]);
    const xslt = compiled(payload);
    const output = transform(xslt, '<Root/>');
    expect(text(output, 'Left')).toBe('1.25');
    expect(text(output, 'Right')).toBe('9.50');
    expect(scriptText(xslt).match(/public\s+string\s+ChangeDecimalSeparator\s*\(/g)).toHaveLength(1);
  });

  testTransform('reuses identical signatures across pages even when reference parameter names differ', () => {
    const payload = synthetic([
      scriptPage('First reference', [{ id: 'left-ref', body: decimalSignature, target: 'Left', inputs: ['2,75'] }]),
      scriptPage('Second reference', [
        { id: 'right-ref', body: 'public string ChangeDecimalSeparator(string amount)', target: 'Right', inputs: ['8,05'] },
      ]),
      scriptPage('GlobalFunctions', [{ id: 'global', body: decimalBody }]),
    ]);
    const xslt = compiled(payload);
    const output = transform(xslt, '<Root/>');
    expect(text(output, 'Left')).toBe('2.75');
    expect(text(output, 'Right')).toBe('8.05');
    expect(scriptText(xslt).match(/public\s+string\s+ChangeDecimalSeparator\s*\(/g)).toHaveLength(1);
  });

  test.each([false, true])(
    'rejects unresolved signature-only calls instead of emitting invalid C# (other overload exists: %s)',
    (otherOverload) => {
      const pages = [
        scriptPage('Unresolved reference', [
          { id: 'missing-date-body', body: dateSignature, target: 'Date', inputs: ['20261106', 'yyyyMMdd', 'dd/MM/yyyy'] },
        ]),
      ];
      if (otherOverload) {
        pages.push(scriptPage('GlobalFunctions', [{ id: 'wrong-overload', body: zeroBody }]));
      }
      const payload = synthetic(pages);
      const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      const diagnostic = result.errors.map((error) => error.message).join('\n');
      expect(diagnostic).toMatch(/FormatDate/);
      expect(diagnostic).toMatch(/body|implementation|definition/i);
      expect(diagnostic).toMatch(/missing|unresolved|not found|no matching|without|no .*(body|implementation)/i);
      // CompileResult may retain diagnostic XSLT on failure; it must not claim
      // success or emit the bodyless reference as an invalid C# declaration.
      expect(scriptText(result.xslt ?? '<diagnostic/>')).not.toContain(dateSignature);
    }
  );
});
