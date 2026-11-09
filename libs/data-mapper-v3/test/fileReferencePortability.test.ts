import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type * as ExtensionObjectResolver from '../src/schema/extensionObjectResolver';
import type * as SchemaFileResolver from '../src/schema/schemaFileResolver';

describe.each([
  { host: 'POSIX', paths: path.posix, directory: '/maps' },
  { host: 'Windows', paths: path.win32, directory: 'C:\\maps' },
])('BizTalk file references on $host', ({ paths, directory }) => {
  let resolveSchemaFilePath: typeof SchemaFileResolver.resolveSchemaFilePath;
  let resolveAssemblyFilePath: typeof ExtensionObjectResolver.resolveAssemblyFilePath;
  const files = new Set<string>();

  beforeEach(async () => {
    files.clear();
    vi.resetModules();
    vi.doMock('path', () => paths);
    vi.doMock('fs', () => ({
      existsSync: (filename: string) => files.has(filename),
      readdirSync: () => [],
    }));
    ({ resolveSchemaFilePath } = await import('../src/schema/schemaFileResolver'));
    ({ resolveAssemblyFilePath } = await import('../src/schema/extensionObjectResolver'));
  });

  afterEach(() => {
    vi.doUnmock('path');
    vi.doUnmock('fs');
    vi.resetModules();
  });

  test.each(['..\\Schemas\\Order.xsd', '../Schemas/Order.xsd', '..\\Schemas/Order.xsd'])(
    'resolves a relative schema reference %s',
    (reference) => {
      const expected = paths.resolve(directory, '..', 'Schemas', 'Order.xsd');
      files.add(expected);
      expect(resolveSchemaFilePath(directory, reference)).toBe(expected);
    }
  );

  test('uses the filename fallback for a Windows Web Reference path', () => {
    const expected = paths.join(directory, 'Reference.xsd');
    files.add(expected);
    expect(resolveSchemaFilePath(directory, '.\\Web References\\localhost\\Reference.xsd')).toBe(expected);
  });

  test('appends the schema extension after normalizing a relative path', () => {
    const expected = paths.join(directory, 'Schemas', 'Order.xsd');
    files.add(expected);
    expect(resolveSchemaFilePath(directory, '.\\Schemas\\Order')).toBe(expected);
  });

  test('returns a normalized fallback for a missing schema', () => {
    expect(resolveSchemaFilePath(directory, '.\\missing\\Unknown.xsd')).toBe(paths.join(directory, 'missing', 'Unknown.xsd'));
  });

  test.each(['.\\bin\\Functions.dll', './bin/Functions.dll', '.\\bin/Functions.dll'])(
    'resolves a relative assembly reference %s',
    (reference) => {
      expect(resolveAssemblyFilePath(reference, directory)).toBe(paths.join(directory, 'bin', 'Functions.dll'));
    }
  );

  test.each([
    'Contoso.Extensions, Version=1.2.3.4, Culture=neutral, PublicKeyToken=0123456789abcdef',
    'C:\\assemblies\\Functions.dll',
    '\\\\server\\share\\Functions.dll',
    '/assemblies/Functions.dll',
  ])('preserves assembly identities and absolute paths: %s', (reference) => {
    expect(resolveAssemblyFilePath(reference, directory)).toBe(reference);
  });
});
