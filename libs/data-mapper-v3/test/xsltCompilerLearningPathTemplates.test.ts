import path from 'node:path';
import { describe, expect, test } from 'vitest';
import { create } from 'xmlbuilder2';
import { loadLearningPathMap } from '../e2e/fixtures/learningPath';
import { XsltCompiler } from '../src/compiler/xsltCompiler';

const samples = [
  ['Conditional-Pattern\\WorkingWithConditions\\03-IfThenElse\\IfThenElseMapSol3.btm', 'GetCivilStatusDescriptionTemplate'],
  ['Content-Enricher-Pattern\\JoinMultipleMessages\\3-UsingXSLTTemplate\\TransformUserAndAddressToOutput.btm', 'AddressTemplate'],
  [
    'Grouping-Pattern-Group-elements-from-different-messages-BizTalk-Maps\\JoinMultipleMessages\\Transform_User_and_Addresses_In_Output.btm',
    'AddressTemplate',
  ],
];

describe.each([false, true])('Learning Path named templates (preserve sequence: %s)', (preserveSequenceOrder) => {
  test.each(samples)('keeps declarations at stylesheet level in %s', async (relativePath, templateName) => {
    const payload = await loadLearningPathMap(path.join(...relativePath.split('\\')));
    payload.map.options.preserveSequenceOrder = preserveSequenceOrder;
    const original = JSON.stringify(payload.map);
    const result = new XsltCompiler().compile(payload.map, payload.sourceSchema ?? undefined, payload.targetSchema ?? undefined);

    expect(result.errors).toEqual([]);
    expect(result.success).toBe(true);
    const namespace = 'http://www.w3.org/1999/XSL/Transform';
    const stylesheet = create(result.xslt!).root().node as unknown as Element;
    const templates = Array.from(stylesheet.getElementsByTagNameNS(namespace, 'template'));
    for (const template of templates) {
      expect(template.parentNode === stylesheet, template.getAttribute('name') || template.getAttribute('match') || '').toBe(true);
    }
    const definition = templates.find((template) => template.getAttribute('name') === templateName);
    expect(definition).toBeDefined();
    const parameters = Array.from(definition!.childNodes)
      .filter((node) => node.nodeType === 1 && (node as Element).namespaceURI === namespace && (node as Element).localName === 'param')
      .map((node) => (node as Element).getAttribute('name'));
    const calls = Array.from(stylesheet.getElementsByTagNameNS(namespace, 'call-template')).filter(
      (call) => call.getAttribute('name') === templateName
    );
    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(Array.from(call.getElementsByTagNameNS(namespace, 'with-param')).map((parameter) => parameter.getAttribute('name'))).toEqual(
        parameters
      );
    }
    expect(JSON.stringify(payload.map)).toBe(original);
  });
});
