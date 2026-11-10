import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from './e2etests/fixtures/learningPath';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { FunctoidRegistry } from '../src/functoids/functoidRegistry';
import { DEFAULT_MAP_OPTIONS, LinkEndpointType, type MapDocument, type MapFunctoid, type MapLink, ParameterType } from '../src/model';
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
const inputNamespace = 'http://WorkingWithConditions.Conditions';
const outputNamespace = 'http://WorkingWithConditions.ConditionsResult2';
const groups = ['BusinessManagers', 'BusinessAssistant', 'Employee'] as const;
type Group = (typeof groups)[number];
interface Person {
  name: string;
  role: string;
  status: string;
}
interface ExpectedRecord {
  Name: string;
  Role: string;
  CivilStatusDescription?: string;
}
interface SwitchFixture {
  file: string;
  mixedIndexes: number[][];
  mixedEmployeeStatuses: string[];
  singleGroups: Group[];
  singleStatuses: string[];
  employeeStatuses: string[];
}

const fixtures: SwitchFixture[] = [
  {
    file: 'MapConditionsRecords.btm',
    mixedIndexes: [
      [0, 1],
      [3, 4],
      [2, 5, 6],
    ],
    mixedEmployeeStatuses: ['Married', 'Single', 'Single'],
    singleGroups: ['BusinessManagers', 'BusinessManagers', 'Employee', 'BusinessAssistant', 'BusinessAssistant', 'Employee', 'Employee'],
    singleStatuses: ['', '', 'Married', '', '', 'Single', 'Single'],
    employeeStatuses: ['Married', 'Single', 'Single', 'Single'],
  },
  {
    file: 'MapConditionsRecordsCScript.btm',
    mixedIndexes: [
      [0, 2, 6],
      [3, 4],
      [1, 5],
    ],
    mixedEmployeeStatuses: ['unknown', 'Single'],
    singleGroups: [
      'BusinessManagers',
      'Employee',
      'BusinessManagers',
      'BusinessAssistant',
      'BusinessAssistant',
      'Employee',
      'BusinessManagers',
    ],
    singleStatuses: ['', 'unknown', '', '', '', 'Single', ''],
    employeeStatuses: ['Married', 'Single', 'unknown', 'Married'],
  },
];
const mixedPeople: Person[] = [
  { name: 'Chief', role: 'CEO', status: 'M' },
  { name: 'PlainDirector', role: 'Director', status: '' },
  { name: 'Research', role: 'R&D Director', status: 'M' },
  { name: 'BusinessSupport', role: 'Business Assistant', status: 'S' },
  { name: 'Support', role: 'Assistant', status: 'M' },
  { name: 'Engineer', role: 'Developer', status: 'S' },
  { name: 'LowercaseChief', role: 'ceo', status: '' },
];

function switchInput(people: Person[]): string {
  const root = create().ele('s:Conditions', { 'xmlns:s': inputNamespace });
  for (const person of people) {
    const record = root.ele('Person');
    record.ele('Name').txt(person.name);
    record.ele('Company').txt('Regression');
    record.ele('Role').txt(person.role);
    record.ele('AdditionalInfo').ele('CivilStatus').txt(person.status);
  }
  // Only the source root is qualified, as in the existing portable XSD.
  return root.end({ headless: true });
}

function transform(xslt: string, input: string): Element {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-learning-path-switch-'));
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
    expect(result.status, result.stderr).toBe(0);
    expect(result.stderr).toBe('');
    const output = readFileSync(outputFile, 'utf8');
    expect(output.trim(), 'Even an empty source must retain the unconditional output root').not.toBe('');
    return create(output).root().node as Element;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

function childElements(root: Element): Element[] {
  return Array.from(root.childNodes)
    .filter((node) => node.nodeType === 1)
    .map((node) => node as Element);
}

function directText(root: Element): string {
  return Array.from(root.childNodes)
    .filter((node) => node.nodeType === 3 || node.nodeType === 4)
    .map((node) => node.nodeValue ?? '')
    .join('')
    .trim();
}

function expectedRecord(person: Person, civilStatus?: string): ExpectedRecord {
  return {
    Name: person.name,
    Role: person.role,
    ...(civilStatus === undefined ? {} : { CivilStatusDescription: civilStatus }),
  };
}

function assertSwitchOutput(root: Element, expected: ExpectedRecord[][]): void {
  expect(root.localName).toBe('ConditionsResultTwo');
  expect(root.namespaceURI).toBe(outputNamespace);
  expect(directText(root)).toBe('');
  const records = childElements(root);
  expect(records.length).toBe(expected.flat().length);
  expect(records.every((record) => groups.some((group) => group === record.localName))).toBe(true);
  // Nested namespace parity with the public original stylesheet is unrelated to loop/guard scope.
  for (const [index, group] of groups.entries()) {
    const actual = records.filter((record) => record.localName === group);
    expect(actual.length, group).toBe(expected[index].length);
    expect(
      actual.map((record) => {
        expect(record.parentNode).toBe(root);
        // Logical links to records are filters, not stray "true"/"false" (or "1"/"0") text.
        expect(directText(record), `${group} must contain only mapped fields`).toBe('');
        const fields = childElements(record);
        expect(fields.length).toBe(group === 'Employee' ? 3 : 2);
        expect(fields.every((field) => childElements(field).length === 0)).toBe(true);
        return Object.fromEntries(fields.map((field) => [field.localName, field.textContent]));
      }),
      group
    ).toEqual(expected[index]);
  }
}

async function compileSwitch(fixture: SwitchFixture, preserveSequenceOrder: boolean): Promise<string> {
  const payload = await loadLearningPathMap(path.join('Conditional-Pattern', 'WorkingWithConditions', '05-SwitchStatement', fixture.file));
  payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
  const original = JSON.stringify(payload.map);
  const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  expect(JSON.stringify(payload.map)).toBe(original);
  return result.xslt!;
}

describe.each([false, true])('Learning Path switch records (preserve sequence: %s)', (preserveSequenceOrder) => {
  describe.each(fixtures)('$file', (fixture) => {
    testTransform.each([false, true])('filters mixed records with per-person values (reverse input: %s)', async (reverse) => {
      const xslt = await compileSwitch(fixture, preserveSequenceOrder);
      const expected = fixture.mixedIndexes.map((indexes, groupIndex) =>
        indexes.map((personIndex, recordIndex) =>
          expectedRecord(mixedPeople[personIndex], groupIndex === 2 ? fixture.mixedEmployeeStatuses[recordIndex] : undefined)
        )
      );
      assertSwitchOutput(
        transform(xslt, switchInput(reverse ? [...mixedPeople].reverse() : mixedPeople)),
        reverse ? expected.map((records) => [...records].reverse()) : expected
      );
    });

    testTransform('retains an empty root without fabricating any role group', async () => {
      assertSwitchOutput(transform(await compileSwitch(fixture, preserveSequenceOrder), switchInput([])), [[], [], []]);
    });

    testTransform.each(mixedPeople.map((person, index) => [person.role, index] as const))(
      'routes a single %s without inheriting another loop or global context',
      async (_role, index) => {
        const person = mixedPeople[index];
        const group = fixture.singleGroups[index];
        const expected = groups.map((candidate) =>
          candidate === group ? [expectedRecord(person, group === 'Employee' ? fixture.singleStatuses[index] : undefined)] : []
        );
        assertSwitchOutput(transform(await compileSwitch(fixture, preserveSequenceOrder), switchInput([person])), expected);
      }
    );

    testTransform(
      'evaluates nested CivilStatus independently for consecutive employees, including empty and lowercase values',
      async () => {
        const people = ['M', 'S', '', 'm'].map((status, index) => ({ name: `Employee${index}`, role: 'Developer', status }));
        assertSwitchOutput(transform(await compileSwitch(fixture, preserveSequenceOrder), switchInput(people)), [
          [],
          [],
          people.map((person, index) => expectedRecord(person, fixture.employeeStatuses[index])),
        ]);
      }
    );
  });
});

const parser = new SchemaParser();
const source = parser.parse(
  '<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"><xs:element name="Root"><xs:complexType><xs:sequence>' +
    '<xs:element name="Items" maxOccurs="unbounded"><xs:complexType><xs:sequence>' +
    '<xs:element name="Enabled" type="xs:string"/><xs:element name="Value" type="xs:string"/>' +
    '</xs:sequence></xs:complexType></xs:element></xs:sequence></xs:complexType></xs:element></xs:schema>',
  'source.xsd'
);

function functoid(id: string, functoidId: number, parameters: MapFunctoid['parameters']): MapFunctoid {
  const definition = FunctoidRegistry.getInstance().getFunctoid(functoidId)!;
  return { id, functoidId, category: definition.category, name: definition.name, x: 0, y: 0, inputLinks: [], outputLinks: [], parameters };
}

const linked = (index: number, value: string) => ({ index, type: ParameterType.Link, value });
const constant = (index: number, value: string) => ({ index, type: ParameterType.Constant, value });
const sourceLink = (id: string, sourcePath: string, targetId: string): MapLink => ({
  id,
  sourceId: sourcePath,
  sourcePath,
  targetId,
  sourceType: LinkEndpointType.SchemaNode,
  targetType: LinkEndpointType.Functoid,
});
const dependency = (id: string, sourceId: string, targetId: string): MapLink => ({
  id,
  sourceId,
  targetId,
  sourceType: LinkEndpointType.Functoid,
  targetType: LinkEndpointType.Functoid,
});
const outputLink = (id: string, sourceId: string, targetPath: string): MapLink => ({
  id,
  sourceId,
  targetId: targetPath,
  targetPath,
  sourceType: LinkEndpointType.Functoid,
  targetType: LinkEndpointType.SchemaNode,
});
const directLink = (id: string, sourcePath: string, targetPath: string): MapLink => ({
  ...outputLink(id, sourcePath, targetPath),
  sourcePath,
  sourceType: LinkEndpointType.SchemaNode,
});

function syntheticMap(preserveSequenceOrder: boolean, functoids: MapFunctoid[], links: MapLink[]): MapDocument {
  return {
    name: 'Switch scope and value regressions',
    version: '1',
    sourceSchema: { location: 'source.xsd' },
    targetSchema: { location: 'target.xsd' },
    options: { ...DEFAULT_MAP_OPTIONS, preserveSequenceOrder },
    pages: [
      {
        id: 'page',
        name: 'Scope',
        functoids: [functoid('loop', 424, [linked(0, 'items')]), ...functoids],
        links: [sourceLink('items', '/Root/Items', 'loop'), outputLink('loop-output', 'loop', '/Result/Line'), ...links],
      },
    ],
  };
}

function compileSynthetic(map: MapDocument, lineContent: string): string {
  const target = parser.parse(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema">
      <xs:element name="Result"><xs:complexType><xs:sequence>
        <xs:element name="Line" maxOccurs="unbounded"><xs:complexType>${lineContent}</xs:complexType></xs:element>
      </xs:sequence></xs:complexType></xs:element>
    </xs:schema>`,
    'target.xsd'
  );
  const result = new XsltCompiler().compile(map, source, target);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  expect(result.xslt).toBeTruthy();
  return result.xslt!;
}

const enabledInput =
  '<Root><Items><Enabled>no</Enabled><Value>99</Value></Items>' +
  '<Items><Enabled>yes</Enabled><Value>7</Value></Items><Items><Enabled>yes</Enabled><Value>11</Value></Items></Root>';

describe.each([false, true])('Switch dependency boundaries (preserve sequence: %s)', (preserveSequenceOrder) => {
  testTransform('redeclares shared dependencies across sibling guards but reuses them within each conditional block', () => {
    const map = syntheticMap(
      preserveSequenceOrder,
      [
        functoid('equal', 315, [linked(0, 'enabled'), constant(1, 'yes')]),
        functoid('firstGuard', 321, [linked(0, 'first-enabled'), constant(1, 'true')]),
        functoid('secondGuard', 320, [linked(0, 'second-enabled'), constant(1, 'false')]),
        functoid('text', 107, [linked(0, 'number'), constant(1, '!')]),
      ],
      [
        sourceLink('enabled', '/Root/Items/Enabled', 'equal'),
        dependency('first-enabled', 'equal', 'firstGuard'),
        dependency('second-enabled', 'equal', 'secondGuard'),
        outputLink('first-guard', 'firstGuard', '/Result/Line/First'),
        outputLink('second-guard', 'secondGuard', '/Result/Line/Second'),
        sourceLink('number', '/Root/Items/Value', 'text'),
        ...['First', 'Second'].flatMap((record) =>
          ['Value', 'Again'].map((field) => outputLink(`${record}-${field}`, 'text', `/Result/Line/${record}/${field}`))
        ),
      ]
    );
    const xslt = compileSynthetic(
      map,
      `<xs:sequence>${['First', 'Second']
        .map(
          (record) =>
            `<xs:element name="${record}" minOccurs="0"><xs:complexType><xs:sequence>
                <xs:element name="Value" type="xs:string"/><xs:element name="Again" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>`
        )
        .join('')}</xs:sequence>`
    );
    const lines = childElements(transform(xslt, enabledInput));
    expect(lines.length).toBe(3);
    expect(
      lines.map((line) =>
        childElements(line).map((record) => {
          expect(directText(record)).toBe('');
          return [record.localName, ...childElements(record).map((field) => field.textContent)];
        })
      )
    ).toEqual([
      [],
      [
        ['First', '7!', '7!'],
        ['Second', '7!', '7!'],
      ],
      [
        ['First', '11!', '11!'],
        ['Second', '11!', '11!'],
      ],
    ]);
    // .NET execution also rejects duplicate declarations in a single lexical scope.
  });

  testTransform('preserves false and true logical results when linked to scalar elements and attributes', () => {
    const map = syntheticMap(
      preserveSequenceOrder,
      [functoid('equal', 315, [linked(0, 'enabled'), constant(1, 'yes')])],
      [
        sourceLink('enabled', '/Root/Items/Enabled', 'equal'),
        outputLink('boolean', 'equal', '/Result/Line/Boolean'),
        outputLink('flag', 'equal', '/Result/Line/@flag'),
        directLink('value', '/Root/Items/Value', '/Result/Line/Value'),
      ]
    );
    const xslt = compileSynthetic(
      map,
      '<xs:sequence><xs:element name="Boolean" type="xs:boolean"/><xs:element name="Value" type="xs:string"/></xs:sequence>' +
        '<xs:attribute name="flag" type="xs:boolean"/>'
    );
    expect(
      childElements(transform(xslt, enabledInput)).map((line) => ({
        flag: line.getAttribute('flag'),
        fields: childElements(line).map((field) => [field.localName, field.textContent]),
      }))
    ).toEqual([
      {
        flag: 'false',
        fields: [
          ['Boolean', 'false'],
          ['Value', '99'],
        ],
      },
      {
        flag: 'true',
        fields: [
          ['Boolean', 'true'],
          ['Value', '7'],
        ],
      },
      {
        flag: 'true',
        fields: [
          ['Boolean', 'true'],
          ['Value', '11'],
        ],
      },
    ]);
  });

  testTransform('does not reinterpret numeric zero or empty/string direct record values as logical filters', () => {
    const map = syntheticMap(
      preserveSequenceOrder,
      [
        functoid('number', 118, [linked(0, 'number-input'), constant(1, '0')]),
        functoid('text', 107, [linked(0, 'text-input'), constant(1, '')]),
      ],
      [
        sourceLink('number-input', '/Root/Items/Value', 'number'),
        sourceLink('text-input', '/Root/Items/Enabled', 'text'),
        outputLink('number-output', 'number', '/Result/Line/NumberRecord'),
        outputLink('text-output', 'text', '/Result/Line/StringRecord'),
        directLink('number-child', '/Root/Items/Value', '/Result/Line/NumberRecord/Value'),
        directLink('text-child', '/Root/Items/Value', '/Result/Line/StringRecord/Value'),
      ]
    );
    const xslt = compileSynthetic(
      map,
      `<xs:sequence>${['NumberRecord', 'StringRecord']
        .map(
          (record) =>
            `<xs:element name="${record}"><xs:complexType mixed="true"><xs:sequence>
                <xs:element name="Value" type="xs:string"/>
              </xs:sequence></xs:complexType></xs:element>`
        )
        .join('')}</xs:sequence>`
    );
    const output = transform(
      xslt,
      '<Root><Items><Enabled/><Value>0</Value></Items><Items><Enabled>false</Enabled><Value>7</Value></Items></Root>'
    );
    expect(
      childElements(output).map((line) =>
        childElements(line).map((record) => [
          record.localName,
          directText(record),
          ...childElements(record).map((field) => field.textContent),
        ])
      )
    ).toEqual([
      [
        ['NumberRecord', '0', '0'],
        ['StringRecord', '', '0'],
      ],
      [
        ['NumberRecord', '7', '7'],
        ['StringRecord', 'false', '7'],
      ],
    ]);
  });
});
