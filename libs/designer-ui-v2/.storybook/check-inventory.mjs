import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath, URL } from 'node:url';
import test from 'node:test';
import ts from 'typescript';

// Explicit node --test entry; avoid *.test.* so Vitest's library discovery stays unchanged.
// Admission inventory includes the provider and both icons, not just card families.
const visualExports = [
  'DesignerUiScope',
  'ActionNodeCard',
  'TriggerNodeCard',
  'ConditionNodeCard',
  'AgentNodeCard',
  'AgentToolsPanel',
  'ToolItemCard',
  'NodeInfoCard',
  'NodeHoverCard',
  'LoopNodeCard',
  'PlaceholderTriggerCard',
  'NodeCard',
  'NodeCardBody',
  'NodeCardFooter',
  'NodeHandle',
  'NodeInputHandle',
  'NodeOutputHandles',
  'NodeIconTile',
  'NodeText',
  'NodeStatusBadge',
  'NodeTestDataIndicator',
  'NodeToolConnector',
  'NodeLabeledHandle',
  'NodeBranchOutputs',
  'NodeLine',
  'NodeActionAdd',
  'IfIconRegular',
  'IfIconFilled',
  'NodeFrame',
  'NodeMergePoint',
  'EdgePillButton',
  'NodeAddButton',
  'CollapseChip',
];
const storiesDir = new URL('../stories/', import.meta.url);
const nonvisualExports = [
  'defaultNodeStrings',
  'NODE_GLYPHS',
  'getNodeGlyph',
  'nodeMetrics',
  'nodeHoverCardTiming',
  'designerUiTokens',
  'nodeCardVars',
  'useDesignerUiOutlet',
  'resolveNodeIcons',
  'NodeHandleAxisContext',
  'useNodeHandleAxis',
  'NodeHoverCardActiveContext',
  'joinNodeSubtitle',
  'getNodeStatusLabel',
  'nodeLineStrokes',
  'useNodeLineStyles',
  'toSafeExternalHref',
  'PLACEHOLDER_TRIGGER_TITLE',
];

function assertPublicValueInventory(actual, visual, nonvisual) {
  const classified = new Set([...visual, ...nonvisual]);
  assert.equal(classified.size, visual.length + nonvisual.length, 'Public value classifications must be unique and disjoint');
  const actualValues = new Set(actual);
  const unknown = actual.filter((name) => !classified.has(name)).sort();
  const missing = [...classified].filter((name) => !actualValues.has(name)).sort();
  assert.deepEqual(unknown, [], `Unclassified public values: ${unknown.join(', ')}`);
  assert.deepEqual(missing, [], `Classified values missing from public root: ${missing.join(', ')}`);
}

function getPublicValueExports(program, rootFile) {
  const checker = program.getTypeChecker();
  const visited = new Map();
  const collect = (source) => {
    if (visited.has(source)) {
      return visited.get(source);
    }
    const module = checker.getSymbolAtLocation(source);
    assert.ok(module, `No public module symbol for ${source.fileName}`);
    const values = checker.getExportsOfModule(module).filter((symbol) => {
      const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
      return (target.flags & ts.SymbolFlags.Value) !== 0;
    });
    const runtimeNames = new Set(
      values
        .filter((symbol) =>
          symbol.declarations?.some(
            (declaration) =>
              declaration.getSourceFile() === source &&
              !ts.isExportSpecifier(declaration) &&
              !ts.isNamespaceExport(declaration) &&
              !ts.isTypeOnlyExportDeclaration(declaration)
          )
        )
        .map((symbol) => symbol.getName())
    );
    visited.set(source, runtimeNames);
    // Resolved symbols alone lose the "export type *" boundary, so follow only runtime barrel edges.
    for (const statement of source.statements) {
      if (!ts.isExportDeclaration(statement) || statement.isTypeOnly) {
        continue;
      }
      if (statement.exportClause) {
        if (ts.isNamedExports(statement.exportClause)) {
          for (const specifier of statement.exportClause.elements) {
            if (!specifier.isTypeOnly) {
              runtimeNames.add(specifier.name.text);
            }
          }
        } else {
          runtimeNames.add(statement.exportClause.name.text);
        }
      } else if (statement.moduleSpecifier) {
        const target = checker.getSymbolAtLocation(statement.moduleSpecifier);
        const targetSource = target?.declarations?.find(ts.isSourceFile);
        assert.ok(targetSource, `Unresolved public barrel edge in ${source.fileName}`);
        for (const name of collect(targetSource)) {
          if (name !== 'default') {
            runtimeNames.add(name);
          }
        }
      }
    }
    const result = new Set(values.map((symbol) => symbol.getName()).filter((name) => runtimeNames.has(name)));
    visited.set(source, result);
    return result;
  };
  const root = program.getSourceFile(rootFile);
  assert.ok(root, `Missing public root source: ${rootFile}`);
  return [...collect(root)].sort();
}

test('every actual public runtime value is classified for visual stories or nonvisual API docs', () => {
  const configPath = fileURLToPath(new URL('../tsconfig.storybook.json', import.meta.url));
  const config = ts.readConfigFile(configPath, ts.sys.readFile);
  assert.equal(config.error, undefined);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, fileURLToPath(new URL('../', import.meta.url)));
  assert.equal(parsed.errors.length, 0);
  const rootFile = fileURLToPath(new URL('../src/index.ts', import.meta.url));
  const program = ts.createProgram([rootFile], parsed.options);
  assertPublicValueInventory(getPublicValueExports(program, rootFile), visualExports, nonvisualExports);
});

test('an additional public value fails until it receives an explicit visual or nonvisual classification', () => {
  assert.throws(
    () => assertPublicValueInventory([...visualExports, ...nonvisualExports, 'FuturePublicValue'], visualExports, nonvisualExports),
    /Unclassified public values: FuturePublicValue/
  );
});

test('the compiler inventory follows named aliases and star exports but ignores type-only re-exports', () => {
  const directory = '/storybook-public-inventory-fixture';
  const rootFile = `${directory}/index.ts`;
  const files = new Map([
    [
      rootFile,
      "export * from './barrel'; export { aliased as PublicAlias } from './values'; export type { typeOnlyValue } from './values'; export type * from './type-only-star';",
    ],
    [`${directory}/barrel.ts`, "export { aliased } from './values'; export const starValue = 3; export type OnlyType = { name: string };"],
    [`${directory}/values.ts`, 'export const aliased = 1; export const typeOnlyValue = 2; export interface ValueShape { name: string };'],
    [`${directory}/type-only-star.ts`, 'export const hiddenByTypeOnlyStar = 3;'],
  ]);
  const options = { module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Node10, noLib: true };
  const host = ts.createCompilerHost(options);
  host.fileExists = (name) => files.has(name);
  host.directoryExists = (name) => name === directory;
  host.readFile = (name) => files.get(name);
  host.getSourceFile = (name, languageVersion) => {
    const text = files.get(name);
    return text === undefined ? undefined : ts.createSourceFile(name, text, languageVersion, true);
  };
  const program = ts.createProgram([rootFile], options, host);
  assert.deepEqual(getPublicValueExports(program, rootFile), ['PublicAlias', 'aliased', 'starValue']);
});

test('no public visual export is omitted or grouped under another component metadata', async () => {
  const files = (await readdir(storiesDir)).filter((file) => file.endsWith('.stories.tsx'));
  const components = [];
  for (const file of files) {
    const source = await readFile(new URL(file, storiesDir), 'utf8');
    const component = source.match(/satisfies Meta<typeof (\w+)>/g) ?? [];
    assert.equal(component.length, 1, `${file} must have exactly one typed component metadata`);
    const name = component[0].match(/typeof (\w+)/)[1];
    assert.match(source, new RegExp(`component: ${name}[^\\w]`), `${file} must document the actual export`);
    assert.match(source, /export default meta/, `${file} must export its metadata`);
    components.push(name);
  }
  assert.deepEqual(components.sort(), [...visualExports].sort());
});

test('story examples never teach unsupported package subpaths or internal source imports', async () => {
  for (const file of await readdir(storiesDir)) {
    if (!/\.(tsx?|mdx)$/.test(file)) {
      continue;
    }
    const source = await readFile(new URL(file, storiesDir), 'utf8');
    const specifiers = [...source.matchAll(/from ['"](@microsoft\/designer-ui-v2[^'"]*)['"]/g)].map((match) => match[1]);
    assert.ok(
      specifiers.every((specifier) => ['@microsoft/designer-ui-v2', '@microsoft/designer-ui-v2/metrics'].includes(specifier)),
      fileURLToPath(new URL(file, storiesDir))
    );
    assert.doesNotMatch(source, /from ['"]\.\.\/(?:src|build)\//, file);
  }
});
