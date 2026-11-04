import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { XsltCompiler } from '../src/compiler/xsltCompiler';
import { readTextFileSync } from '../src/schema/schemaFileResolver';
import { behaviorMaps, loadLearningPathMap } from './fixtures/learningPath';
import { expect, test, type MapperFixture } from './fixtures/mapperHost';

interface OutputElement {
  name: string;
  namespace: string | null;
  text: string;
  attributes: Record<string, string>;
  children: OutputElement[];
}

const root = path.resolve(__dirname, '..');
const transformDirectory = path.join(root, 'tools', 'compiler-worker', 'runtime', 'win-x64', 'framework-transform');
const transformExecutable = path.join(transformDirectory, 'BizTalk.DataMapper.FrameworkTransform.exe');

function transform(xslt: string, input: string): string {
  const directory = mkdtempSync(path.join(os.tmpdir(), 'learning-path-transform-'));
  try {
    const xsltPath = path.join(directory, 'map.xslt');
    const inputPath = path.join(directory, 'input.xml');
    const outputPath = path.join(directory, 'output.xml');
    writeFileSync(xsltPath, xslt);
    writeFileSync(inputPath, input);
    execFileSync(transformExecutable, [xsltPath, inputPath, outputPath], { timeout: 30_000, windowsHide: true });
    return readFileSync(outputPath, 'utf8');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

// The browser host is mocked, but compiler and .NET transform results are real.
async function testMap(mapper: MapperFixture, relativePath: string, inputXml: string): Promise<OutputElement> {
  const payload = await loadLearningPathMap(relativePath);
  await mapper.open(payload);
  const { ui, host } = mapper;
  const compiling = host.waitForNext('compile');
  await ui.validateButton.click();
  const compileMessage = await compiling;
  expect(compileMessage.data).toEqual(payload.map);
  const result = new XsltCompiler().compile(compileMessage.data, payload.sourceSchema!, payload.targetSchema!);
  expect(result.errors).toEqual([]);
  expect(result.success).toBe(true);
  await test.info().attach('compiled.xslt', { body: result.xslt!, contentType: 'application/xml' });
  await host.send({ type: 'compileResult', data: result });
  await expect(ui.notification).toContainText('Compiled');

  const generating = host.waitForNext('generateInstance');
  await ui.testMapButton.click();
  expect((await generating).side).toBe('source');
  const testing = host.waitForNext('testMapWithInput');
  await host.send({ type: 'instanceGenerated', data: { side: 'source', xml: inputXml } });
  const message = await testing;
  expect(message.data).toEqual({ map: payload.map, inputXml });
  const output = transform(result.xslt!, message.data.inputXml);
  await test.info().attach('transformed.xml', { body: output, contentType: 'application/xml' });
  await host.send({ type: 'testMapResult', data: { output } });
  await expect(ui.instanceEditor).toHaveValue(inputXml.replace(/\r\n/g, '\n'));
  await expect(ui.testOutput).toHaveText(output);
  expect(host.messages('update')).toHaveLength(0);

  return ui.page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, 'application/xml');
    if (document.getElementsByTagName('parsererror').length > 0) {
      throw new Error('Transform output is not well-formed XML');
    }
    const inspect = (element: Element): OutputElement => ({
      name: element.localName,
      namespace: element.namespaceURI,
      text: element.textContent ?? '',
      attributes: Object.fromEntries(
        Array.from(element.attributes)
          .filter((attribute) => attribute.namespaceURI !== 'http://www.w3.org/2000/xmlns/')
          .map((attribute) => [attribute.localName, attribute.value])
      ),
      children: Array.from(element.children).map(inspect),
    });
    return inspect(document.documentElement);
  }, output);
}

function fields(element: OutputElement): Record<string, string> {
  return Object.fromEntries(element.children.map((child) => [child.name, child.text]));
}

test.describe('BizTalk learning-path transformations @learning-path', () => {
  test.skip(process.platform !== 'win32', 'The original BTM schema references use Windows paths.');

  test.beforeAll(() => {
    if (!existsSync(transformExecutable)) {
      test.setTimeout(150_000);
      execFileSync(
        'dotnet',
        [
          'build',
          path.join(
            root,
            'tools',
            'compiler-worker',
            'BizTalk.DataMapper.FrameworkTransform',
            'BizTalk.DataMapper.FrameworkTransform.csproj'
          ),
          '--configuration',
          'Release',
          '--output',
          transformDirectory,
        ],
        { cwd: root, timeout: 120_000, windowsHide: true, stdio: 'pipe' }
      );
    }
  });

  test('name-based links preserve repeating items, values and target field order', async ({ mapper }) => {
    const output = await testMap(
      mapper,
      behaviorMaps.direct,
      `<p:PurchaseOrder xmlns:p="http://BizTalkMapperSemanticTranslatorPattern.PurchaseOrder">
        <From>A</From><To>B</To><LineItems>
          <Item><Product>P1</Product><Description>Widget</Description><Price>12.5</Price><Quantity>2</Quantity></Item>
          <Item><Product>P2</Product><Description>Gadget</Description><Price>7</Price><Quantity>3</Quantity></Item>
        </LineItems>
      </p:PurchaseOrder>`
    );
    expect(output).toMatchObject({ name: 'PO', namespace: 'http://BizTalkMapperSemanticTranslatorPattern.POByName' });
    expect(output.children.map((child) => child.name)).toEqual(['LineItems', 'To', 'From']);
    expect(fields(output)).toMatchObject({ From: 'A', To: 'B' });
    const items = output.children[0].children;
    expect(items.map(fields)).toEqual([
      { Product: 'P1', Description: 'Widget', Quantity: '2', Price: '12.5' },
      { Product: 'P2', Description: 'Gadget', Quantity: '3', Price: '7' },
    ]);
    for (const item of items) {
      expect(item.children.map((child) => child.name)).toEqual(['Product', 'Description', 'Quantity', 'Price']);
    }
  });

  for (const email of [true, false]) {
    test(`content filtering preserves ordered concatenation constants ${email ? 'with' : 'without'} an email`, async ({ mapper }) => {
      const output = await testMap(
        mapper,
        behaviorMaps.filter,
        `<c:CustomerService xmlns:c="http://BizTalkMapperContentFilterPattern.CustomerService">
          <RequestDate>2026-01-01T00:00:00</RequestDate><Name>Ada</Name><TaxId>T1</TaxId>
          <ContactPhone><ContactName>Bob</ContactName><Phone>555</Phone>${email ? '<Email>a@example.test</Email>' : ''}</ContactPhone>
          <Address><Address>Main St</Address><PostalCode>123</PostalCode><Region>R</Region><Locality>L</Locality><Country>US</Country></Address>
        </c:CustomerService>`
      );
      expect(output).toMatchObject({ name: 'Client', namespace: 'http://BizTalkMapperContentFilterPattern.Client' });
      expect(fields(output)).toEqual({
        Name: 'Ada',
        Address: 'Main St, 123, US',
        Phone: '555',
        ...(email ? { Email: 'a@example.test' } : {}),
        TaxId: 'T1',
      });
      expect(output.children).toHaveLength(email ? 5 : 4);
    });
  }

  test('default generation retains both schema defaults and explicit map constants', async ({ mapper }) => {
    const output = await testMap(
      mapper,
      behaviorMaps.defaults,
      '<i:Input xmlns:i="http://GenerateDefaultFixedNodes.Input"><Name>Ada</Name><Address>Main St</Address></i:Input>'
    );
    expect(output).toMatchObject({ name: 'Output', namespace: 'http://GenerateDefaultFixedNodes.Output' });
    expect(fields(output)).toEqual({
      Name: 'Ada',
      Address: 'Main St',
      Type: 'Person',
      MandatoryElement: 'Default Value Inside the Map',
    });
  });

  for (const sample of [
    { file: 'IfThenElseSource.xml', Name: 'Sandro Pereira', Sex: 'M', Age: '35', CivilStatusDescription: 'Married' },
    { file: 'IfThenElseSource2.xml', Name: 'Sandro', Sex: 'N/D', Age: '35', CivilStatusDescription: 'Single' },
    { file: 'IfThenElseSource3.xml', Name: 'Sandro Pereira', Sex: 'M', Age: '0', CivilStatusDescription: 'Married' },
  ]) {
    test(`three-page conditions choose exactly one branch for ${sample.file}`, async ({ mapper }) => {
      const input = readTextFileSync(
        path.resolve(__dirname, 'samples', 'LearningPath', 'Conditional-Pattern', 'TestFiles', '03', sample.file)
      );
      expect(input).toBeTruthy();
      const output = await testMap(mapper, behaviorMaps.conditions, input!);
      expect(output.namespace).toBe('http://WorkingWithConditions.IfThenElseDestination');
      expect(fields(output)).toEqual({
        Name: sample.Name,
        Sex: sample.Sex,
        Age: sample.Age,
        CivilStatusDescription: sample.CivilStatusDescription,
      });
      expect(output.children).toHaveLength(4);
    });
  }

  test('looping maps each record to attributes without cross-record value leakage', async ({ mapper }) => {
    const output = await testMap(
      mapper,
      behaviorMaps.loop,
      `<s:Surveys xmlns:s="http://LoopingPattern.Survays">
        <GeneralSurvey><Name>A</Name><Address>A St</Address><City>X</City><State>WA</State><PostalCode>1</PostalCode><SurveyId>S1</SurveyId><Question><Number>1</Number><Response>yes</Response></Question></GeneralSurvey>
        <GeneralSurvey><Name>B</Name><Address>B St</Address><City>Y</City><State>OR</State><PostalCode>2</PostalCode><SurveyId>S2</SurveyId><Question><Number>1</Number><Response>no</Response></Question></GeneralSurvey>
      </s:Surveys>`
    );
    expect(output).toMatchObject({ name: 'MasterAddresses', namespace: 'http://LoopingPattern.MasterAddresses' });
    test.fail(true, 'Looping functoid output is emitted as a scalar value, losing repeated records and their target attributes.');
    expect(output.children.map((child) => ({ name: child.name, attributes: child.attributes }))).toEqual([
      { name: 'Address', attributes: { Name: 'A', Street: 'A St', City: 'X', State: 'WA', PostalCode: '1' } },
      { name: 'Address', attributes: { Name: 'B', Street: 'B St', City: 'Y', State: 'OR', PostalCode: '2' } },
    ]);
  });

  test('inline XSLT sorts IDs numerically and nested countries in descending order', async ({ mapper }) => {
    const output = await testMap(
      mapper,
      behaviorMaps.sort,
      '<p:Persons xmlns:p="http://BizTalkMapperSortingPattern.PersonsWithId"><Person Id="10"><Name>Ten</Name><Nacionality>US</Nacionality><ListCountriesVisited><Country>Austria</Country><Country>Zimbabwe</Country></ListCountriesVisited></Person><Person Id="2"><Name>Two</Name><Nacionality>PT</Nacionality></Person></p:Persons>'
    );
    expect(output.name).toBe('Persons');
    test.fail(true, 'Inline XSLT output is wrapped in an extra target Person element instead of replacing that target node.');
    expect(output.children.map((person) => ({ id: person.attributes.Id, name: fields(person).Name }))).toEqual([
      { id: '2', name: 'Two' },
      { id: '10', name: 'Ten' },
    ]);
    const countries = output.children[1].children.find((child) => child.name === 'ListCountriesVisited');
    expect(countries?.children.map((child) => child.text)).toEqual(['Zimbabwe', 'Austria']);
  });
});
