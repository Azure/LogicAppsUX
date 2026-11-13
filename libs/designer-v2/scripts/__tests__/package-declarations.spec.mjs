import { dirname, join, relative, resolve, sep } from 'node:path';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import {
  assertNoPrivatePathReferences,
  consumerCompilerOptions,
  findPrivateModuleReference,
  privatePackage,
} from '../package-declaration-guards.mjs';

const workspace = resolve('declaration-guard-test-workspace');
const layoutWorkspace = join(workspace, 'graph-layout');
const declarationFile = join(workspace, 'designer-v2', 'build', 'lib', 'index.d.ts');

function source(contents, file = declarationFile, kind = ts.ScriptKind.TS) {
  return ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true, kind);
}

function diagnosticsFor(consumerDeclarations, moduleResolution) {
  const consumer = resolve('virtual-declaration-consumer').replaceAll('\\', '/');
  const entry = `${consumer}/index.d.ts`;
  const files = new Map([
    [entry.toLowerCase(), consumerDeclarations],
    [`${consumer}/_graph-layout/index.d.ts`.toLowerCase(), 'export interface ElkNode { id: string }\n'],
  ]);
  const normalize = (name) => name.replaceAll('\\', '/').toLowerCase();
  const { options, errors } = ts.convertCompilerOptionsFromJson({ ...consumerCompilerOptions, moduleResolution, types: [] }, consumer);
  expect(errors).toEqual([]);
  delete options.lib;
  options.noLib = true;
  const host = ts.createCompilerHost(options);
  host.getCurrentDirectory = () => consumer;
  host.fileExists = (name) => files.has(normalize(name));
  host.readFile = (name) => files.get(normalize(name));
  host.directoryExists = (name) => {
    const prefix = `${normalize(name).replace(/\/$/, '')}/`;
    return [...files.keys()].some((file) => file.startsWith(prefix));
  };
  host.getDirectories = () => [];
  host.getSourceFile = (name, languageVersion) => {
    const contents = files.get(normalize(name));
    return contents === undefined ? undefined : ts.createSourceFile(name, contents, languageVersion, true);
  };
  return ts
    .getPreEmitDiagnostics(ts.createProgram([entry], options, host))
    .filter((diagnostic) => diagnostic.code !== 2318)
    .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

describe('graph-layout declaration guards', () => {
  const workspaceReference = relative(dirname(declarationFile), join(layoutWorkspace, 'src', 'index.ts'))
    .split(sep)
    .join('/');

  it.each([
    '../../node_modules/@microsoft/logic-apps-graph-layout/dist/index.d.ts',
    '..\\..\\node_modules\\@microsoft\\logic-apps-graph-layout\\dist\\index.d.ts',
    '../../node_modules/@Microsoft/Logic-Apps-Graph-Layout/dist/index.d.ts',
    '../../node_modules/@microsoft/other/../logic-apps-graph-layout/dist/index.d.ts',
    workspaceReference,
  ])('rejects a preserved private path reference: %s', (reference) => {
    const declaration = source(`/// <reference path="${reference}" preserve="true" />\nexport {};\n`);
    expect(declaration.referencedFiles).toHaveLength(1);
    expect(() => assertNoPrivatePathReferences(declaration, declarationFile, layoutWorkspace)).toThrow(
      'Unsupported graph-layout path reference'
    );
  });

  it.each(['.d.mts', '.d.cts'])('rejects private path references in %s declarations', (extension) => {
    const file = declarationFile.replace(/\.d\.ts$/, extension);
    const declaration = source(`/// <reference path="../../node_modules/${privatePackage}/index.d.ts" preserve="true" />\n`, file);
    expect(() => assertNoPrivatePathReferences(declaration, file, layoutWorkspace)).toThrow('Unsupported graph-layout path reference');
  });

  it('accepts references to bundled declarations and similarly named packages', () => {
    const declaration = source(
      '/// <reference path="./_graph-layout/index.d.ts" preserve="true" />\n' +
        '/// <reference path="../../node_modules/@microsoft/logic-apps-graph-layout-other/index.d.ts" preserve="true" />\n'
    );
    expect(() => assertNoPrivatePathReferences(declaration, declarationFile, layoutWorkspace)).not.toThrow();
    expect(findPrivateModuleReference(declaration)).toBeUndefined();
  });

  it.each([
    `import '${privatePackage}';`,
    `import '${privatePackage}/internal';`,
    "import '@Microsoft/Logic-Apps-Graph-Layout/internal';",
    `export * from '${privatePackage}/internal';`,
    `type Node = import('${privatePackage}/internal').Node;`,
    `import Layout = require('${privatePackage}/internal');`,
    `/// <reference types="${privatePackage}/internal" />`,
  ])('detects a private declaration reference: %s', (declaration) => {
    expect(findPrivateModuleReference(source(declaration))?.toLowerCase()).toContain(privatePackage);
  });

  it.each([
    `import '${privatePackage}/internal';`,
    `export * from '${privatePackage}/internal';`,
    `import('${privatePackage}/internal');`,
    `import(\`${privatePackage}/\${name}\`);`,
    `require('${privatePackage}/internal');`,
    `require.resolve('${privatePackage}/internal');`,
    `module.require('${privatePackage}/internal');`,
    `import('@microsoft/logic-apps-graph-layout\\x2finternal');`,
    `const name = '${privatePackage}/internal'; import(name);`,
    `const name = '${privatePackage}'; import(name);`,
  ])('detects a private JavaScript reference: %s', (javascript) => {
    expect(findPrivateModuleReference(source(javascript, 'index.js', ts.ScriptKind.JS))).toMatch(privatePackage);
  });

  it('accepts bundled imports, lookalike packages, and ordinary strings', () => {
    const javascript = `import './_graph-layout/index.js'; import '${privatePackage}-other'; const name = 'layout';`;
    expect(findPrivateModuleReference(source(javascript, 'index.js', ts.ScriptKind.JS))).toBeUndefined();
    expect(findPrivateModuleReference(source(`export type Name = '${privatePackage}';`))).toBeUndefined();
  });

  it.each(['bundler', 'node'])('checks side-effect imports and retains stylesheet errors with %s resolution', (resolution) => {
    const diagnostics = diagnosticsFor(
      `import '${privatePackage}/internal';\n` +
        "import './unresolved-side-effect';\n" +
        "import './lib/ui/styles.less';\n" +
        "import '@xyflow/react/dist/style.css';\n",
      resolution
    );
    expect(diagnostics).toHaveLength(4);
    expect(diagnostics.join('\n')).toContain(privatePackage);
    expect(diagnostics.join('\n')).toContain('./unresolved-side-effect');
    expect(diagnostics.join('\n')).toContain('./lib/ui/styles.less');
    expect(diagnostics.join('\n')).toContain('@xyflow/react/dist/style.css');
  });

  it.each(['bundler', 'node'])('accepts an ordinary bundled declaration with %s resolution', (resolution) => {
    const declaration = "import './_graph-layout/index.js';\nexport type { ElkNode } from './_graph-layout/index.js';\n";
    expect(findPrivateModuleReference(source(declaration))).toBeUndefined();
    expect(diagnosticsFor(declaration, resolution)).toEqual([]);
  });
});
