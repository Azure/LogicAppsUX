import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from '../e2e/fixtures/learningPath';
import { XsltCompiler } from '../src/compiler/xsltCompiler';

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
const phoneMaps: [string, boolean, boolean][] = [
  ['Basics-principles-of-Maps\\ComoFuncinamOsMapas\\MapasNetPonto\\DemoNetPonto.btm', false, true],
  ['Basics-principles-of-Maps\\ComoFuncinamOsMapas\\Mapas\\ComoFuncionamOsMapas.btm', false, false],
  ['Basics-principles-of-Maps\\ComoFuncinamOsMapas\\NetPonto.btm', false, false],
  ['Basics-principles-of-Maps\\HowMapsWorks\\Maps\\BasicsOfMaps.btm', true, false],
  ['Basics-principles-of-Maps\\HowMapsWorks\\Maps\\HowMapsWorks.btm', true, false],
];

function phoneInput(english: boolean, internationalOnly: boolean): string {
  const root = english ? 'PersonOrigin' : 'PessoaOrigem';
  const namespace = english ? 'http://HowMapsWorks.PersonOrigin' : 'http://ComoFuncinamOsMapas.PessoaOrigem';
  const names = english
    ? ['FirstName', 'LastName', 'DateOfBirth', 'Address', 'ZipCode', 'PhoneCalls', 'PhoneNumber', 'Cost']
    : ['Nome', 'Apelido', 'DataNascimento', 'Morada', 'CodigoPostal', 'Chamada', 'Destino', 'Custo'];
  const [first, last, birth, address, postal, call, number, cost] = names;
  return [
    `<s:${root} xmlns:s="${namespace}">`,
    `<${first}>First</${first}><${last}>Last</${last}><${birth}>1999-05-31</${birth}>`,
    `<${address}>Address</${address}><${postal}>Postal</${postal}>`,
    `<${call} ${number}="+44111" ${cost}="5">call</${call}>`,
    `<${call} ${number}="${internationalOnly ? '+44222' : '+351222'}" ${cost}="10">call</${call}>`,
    `<${call} ${number}="${internationalOnly ? '+44333' : '+351333'}" ${cost}="20">call</${call}>`,
    `</s:${root}>`,
  ].join('');
}

function transform(xslt: string, input: string): Document {
  const directory = mkdtempSync(path.join(tmpdir(), 'mapper-learning-path-cumulative-'));
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
    return create(readFileSync(outputFile, 'utf8')).node as unknown as Document;
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

describe.each([false, true])('Learning Path cumulative totals (preserve sequence: %s)', (preserveSequenceOrder) => {
  testTransform.each(phoneMaps)(
    'sums every matching call and retains empty totals in %s',
    async (relativePath, english, reversedLabels) => {
      const payload = await loadLearningPathMap(path.join(...relativePath.split('\\')));
      payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
      const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
      expect(result.errors).toEqual([]);
      expect(result.success).toBe(true);
      for (const internationalOnly of [false, true]) {
        const output = transform(result.xslt!, phoneInput(english, internationalOnly));
        const national = output.getElementsByTagNameNS('*', english ? 'TotalNational' : 'TotalNacional');
        const international = output.getElementsByTagNameNS('*', english ? 'TotalInternational' : 'TotalInternacional');
        expect(national.length).toBe(1);
        expect(international.length).toBe(1);
        const prefixTotal = internationalOnly ? 0 : 30;
        const otherTotal = internationalOnly ? 35 : 5;
        expect(Number(national[0].textContent)).toBe(reversedLabels ? otherTotal : prefixTotal);
        expect(Number(international[0].textContent)).toBe(reversedLabels ? prefixTotal : otherTotal);
      }
    }
  );

  testTransform('counts children separately for each family, including an empty family', async () => {
    const payload = await loadLearningPathMap(
      path.join('Looping-Pattern', 'LoopingPattern', '01-LoppingTypes', '06-NestedToNested', 'OtherExample', 'NestedFamiliesMapCorrect.btm')
    );
    payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
    const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);
    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    const input = [
      '<s:Families xmlns:s="http://LoopingPattern.Families">',
      ...[2, 1, 0].map(
        (count, family) =>
          `<Family><Parents><Name Sex="M">Parent${family}</Name>${Array.from(
            { length: count },
            (_, child) => `<Child><Name>Child${family}-${child}</Name><Age>7</Age><Sex>F</Sex></Child>`
          ).join('')}</Parents></Family>`
      ),
      '</s:Families>',
    ].join('');
    const output = transform(result.xslt!, input);
    const forms = Array.from(output.getElementsByTagNameNS('*', 'Form'));
    expect(forms.length).toBe(3);
    expect(forms.map((form) => Number(form.getElementsByTagNameNS('*', 'TotalOfChildren')[0]?.textContent))).toEqual([2, 1, 0]);
  });
});
