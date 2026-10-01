import * as path from 'path';
import { getSelectedFileDirectory, resolveBrowseDirectory } from '../src/browseLocation';

describe('browseLocation', () => {
  const documentPath = path.join('C:', 'workspace', 'maps', 'order.btm');
  const rememberedDirectory = path.join('D:', 'schemas', 'recent');
  const schemaPath = path.join('E:', 'shared', 'schemas', 'source.xsd');

  test('prefers the current schema folder over browse history', () => {
    expect(resolveBrowseDirectory(documentPath, rememberedDirectory, schemaPath)).toBe(path.dirname(schemaPath));
  });

  test('uses the remembered folder for general browse actions', () => {
    expect(resolveBrowseDirectory(documentPath, rememberedDirectory)).toBe(rememberedDirectory);
  });

  test('falls back to the map folder without browse history', () => {
    expect(resolveBrowseDirectory(documentPath)).toBe(path.dirname(documentPath));
  });

  test('remembers the directory containing the selected file', () => {
    expect(getSelectedFileDirectory(path.join(rememberedDirectory, 'input.xml'))).toBe(rememberedDirectory);
  });
});
