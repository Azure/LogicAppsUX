import { describe, expect, test } from 'vitest';
import { validateTestMapOutput } from '../src/testMapOutput';

const stylesheet = (method?: string) =>
  `<t:stylesheet xmlns:t="http://www.w3.org/1999/XSL/Transform" version="1.0">${method ? `<t:output method="${method}"/>` : ''}<t:template match="/"/></t:stylesheet>`;

describe('Test Map output validation', () => {
  test.each([
    ['empty output', ''],
    ['declaration only', '<?xml version="1.0" encoding="utf-8"?>'],
    ['comment only', '<!-- no document element -->'],
    ['mismatched tags', '<root><child></root>'],
    ['multiple roots', '<first/><second/>'],
    ['undeclared element prefix', '<p:root/>'],
    ['undeclared attribute prefix', '<root p:attribute="value"/>'],
    ['plain text', 'not XML'],
    ['unknown entity', '<root>&unknown;</root>'],
  ])('rejects XML output containing %s', (_name, output) => {
    expect(() => validateTestMapOutput(stylesheet('xml'), output)).toThrow();
  });

  test.each([
    '<root/>',
    '<?xml version="1.0"?><!-- comment --><p:root xmlns:p="urn:root" p:attribute="value"><![CDATA[<content>]]></p:root>',
    '<root> preserve <b>mixed</b> content &amp; whitespace </root>',
  ])('accepts a complete XML document', (output) => {
    expect(validateTestMapOutput(stylesheet('xml'), output)).toBe('xml');
  });

  test.each([
    ['text', ''],
    ['text', '  text containing < and & is not XML\r\n'],
    ['html', '<!DOCTYPE html><html><body><br><input disabled></body></html>'],
  ])('accepts genuine %s output without treating it as XML', (method, output) => {
    expect(validateTestMapOutput(stylesheet(method), output)).toBe(method);
  });

  test('uses the XML default when the stylesheet does not declare an output method', () => {
    expect(validateTestMapOutput(stylesheet(), '<root/>')).toBe('xml');
    expect(() => validateTestMapOutput(stylesheet(), '<first/><second/>')).toThrow();
  });

  test('recognizes the implicit HTML method for an unnamespaced HTML result root', () => {
    expect(validateTestMapOutput(stylesheet(), '<HTML><body><br></body></HTML>')).toBe('html');
  });

  test('does not infer HTML for explicitly XML or namespaced HTML output', () => {
    expect(() => validateTestMapOutput(stylesheet('xml'), '<html><br></html>')).toThrow();
    expect(() => validateTestMapOutput(stylesheet(), '<html xmlns="urn:html"><br></html>')).toThrow();
  });
});
