import console from 'node:console';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import {
  assertNoPrivatePathReferences,
  declarationFiles,
  findPrivateModuleReference,
  privatePackage,
} from './package-declaration-guards.mjs';

const outputDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'build', 'lib');
const bundledTypes = join(outputDirectory, '_graph-layout', 'index.d.ts');
const layoutWorkspace = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..', 'graph-layout');

if (!existsSync(bundledTypes)) {
  throw new Error(`Missing bundled graph-layout declarations: ${bundledTypes}`);
}

let rewrittenImports = 0;
for (const file of declarationFiles(outputDirectory)) {
  const contents = readFileSync(file, 'utf8');
  const source = ts.createSourceFile(file, contents, ts.ScriptTarget.Latest, true);
  assertNoPrivatePathReferences(source, file, layoutWorkspace);
  const replacements = [];
  const relativeTypes = relative(dirname(file), bundledTypes)
    .split(sep)
    .join('/')
    .replace(/\.d\.ts$/, '.js');
  const localSpecifier = relativeTypes.startsWith('.') ? relativeTypes : `./${relativeTypes}`;

  const replaceSpecifier = (specifier) => {
    if (!specifier || !ts.isStringLiteral(specifier)) {
      return;
    }
    if (specifier.text.startsWith(`${privatePackage}/`)) {
      throw new Error(`Unsupported graph-layout declaration subpath in ${file}: ${specifier.text}`);
    }
    if (specifier.text === privatePackage) {
      if (file === bundledTypes) {
        throw new Error('Bundled graph-layout declarations must not import themselves');
      }
      if (file.endsWith('.d.cts')) {
        throw new Error(`CommonJS declarations cannot import the bundled ESM graph-layout types: ${file}`);
      }
      replacements.push({ start: specifier.getStart(source) + 1, end: specifier.end - 1 });
    }
  };

  for (const directive of source.typeReferenceDirectives) {
    if (directive.fileName === privatePackage || directive.fileName.startsWith(`${privatePackage}/`)) {
      throw new Error(`Unsupported graph-layout type reference in ${file}`);
    }
  }

  const visit = (node) => {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      replaceSpecifier(node.moduleSpecifier);
    } else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) {
      replaceSpecifier(node.argument.literal);
    } else if (ts.isExternalModuleReference(node)) {
      replaceSpecifier(node.expression);
    } else if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) {
      if (node.name.text === privatePackage || node.name.text.startsWith(`${privatePackage}/`)) {
        throw new Error(`Unsupported graph-layout module declaration in ${file}`);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  let updated = contents;
  for (const replacement of replacements.reverse()) {
    updated = `${updated.slice(0, replacement.start)}${localSpecifier}${updated.slice(replacement.end)}`;
  }
  const updatedSource = replacements.length ? ts.createSourceFile(file, updated, ts.ScriptTarget.Latest, true) : source;
  const remaining = findPrivateModuleReference(updatedSource);
  if (remaining) {
    throw new Error(`Unbundled graph-layout reference in ${file}: ${remaining}`);
  }

  if (replacements.length) {
    writeFileSync(file, updated);
    rewrittenImports += replacements.length;
  }
}

console.log(`Bundled graph-layout types and rewrote ${rewrittenImports} declaration imports.`);
