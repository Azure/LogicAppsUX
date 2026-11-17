import { readdirSync } from 'node:fs';
import { dirname, isAbsolute, join, posix, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

export const privatePackage = '@microsoft/logic-apps-graph-layout';

export const consumerCompilerOptions = {
  noEmit: true,
  skipLibCheck: false,
  noUncheckedSideEffectImports: true,
  // Fluent UI v8 has an unrelated declaration error with strict checking enabled.
  strict: false,
  target: 'ES2020',
  module: 'ESNext',
  moduleResolution: 'bundler',
  lib: ['ESNext', 'DOM'],
  esModuleInterop: true,
  jsx: 'react-jsx',
  types: ['node', 'react', 'react-dom'],
  // These unrelated imports already appear in the existing published declarations.
  paths: {
    '@microsoft/logic-apps-shared/src/*': ['./node_modules/@microsoft/logic-apps-shared/build/lib/*'],
    'immer/dist/internal': ['./node_modules/immer/dist/internal.d.ts'],
  },
};

const isPrivateSpecifier = (name) => {
  const normalized = name.toLowerCase();
  return normalized === privatePackage || normalized.startsWith(`${privatePackage}/`);
};

export function* declarationFiles(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const file = join(directory, entry.name);
    if (entry.isDirectory()) {
      yield* declarationFiles(file);
    } else if (/\.d\.(?:ts|mts|cts)$/.test(entry.name)) {
      yield file;
    }
  }
}

function isPrivatePackagePath(name) {
  const normalized = posix.normalize(name.replaceAll('\\', '/')).toLowerCase();
  return `/${normalized}/`.includes(`/${privatePackage}/`);
}

export function assertNoPrivatePathReferences(source, file, layoutWorkspace) {
  for (const directive of source.referencedFiles) {
    const target = resolve(dirname(file), directive.fileName.replaceAll('\\', '/'));
    const fromWorkspace = relative(layoutWorkspace, target);
    if (
      isPrivatePackagePath(directive.fileName) ||
      fromWorkspace === '' ||
      (fromWorkspace !== '..' && !fromWorkspace.startsWith(`..${sep}`) && !isAbsolute(fromWorkspace))
    ) {
      throw new Error(`Unsupported graph-layout path reference in ${file}: ${directive.fileName}`);
    }
  }
}

function staticPrefix(node) {
  if (!node) {
    return undefined;
  }
  if (ts.isStringLiteralLike(node)) {
    return node.text;
  }
  if (ts.isTemplateExpression(node)) {
    return node.head.text;
  }
  if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    return staticPrefix(node.left);
  }
  return undefined;
}

export function findPrivateModuleReference(source) {
  for (const directive of source.typeReferenceDirectives) {
    if (isPrivateSpecifier(directive.fileName)) {
      return directive.fileName;
    }
  }
  for (const directive of source.referencedFiles) {
    if (isPrivatePackagePath(directive.fileName)) {
      return directive.fileName;
    }
  }

  const pending = [source];
  while (pending.length) {
    const node = pending.pop();
    let argument;
    if (source.scriptKind === ts.ScriptKind.JS && (ts.isStringLiteralLike(node) || ts.isTemplateExpression(node))) {
      argument = node;
    } else if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      argument = node.moduleSpecifier;
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      argument = node.argument.literal;
    } else if (ts.isExternalModuleReference(node)) {
      argument = node.expression;
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      argument = node.name;
    } else if (
      ts.isCallExpression(node) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) && node.expression.text === 'require') ||
        (ts.isPropertyAccessExpression(node.expression) &&
          ts.isIdentifier(node.expression.expression) &&
          ((node.expression.expression.text === 'require' && node.expression.name.text === 'resolve') ||
            (node.expression.expression.text === 'module' && node.expression.name.text === 'require'))))
    ) {
      argument = node.arguments[0];
    }

    const specifier = staticPrefix(argument);
    if (specifier && isPrivateSpecifier(specifier)) {
      return specifier;
    }
    ts.forEachChild(node, (child) => {
      pending.push(child);
    });
  }
  return undefined;
}
