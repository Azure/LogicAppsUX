import * as fs from 'node:fs';
import * as path from 'node:path';
import { XMLParser } from 'fast-xml-parser';
import { isMap, isScalar, parseDocument } from 'yaml';
import { type MapImportPlan, planSchemaCollectionImport } from '../schema/mapImportPlanner';
import { getSchemaDependencyLocations, readTextFileSync } from '../schema/schemaFileResolver';

function resolveSchema(mapDirectory: string, reference: string): string {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(reference)) {
    throw new Error(`Remote LML schema references are not supported: ${reference}`);
  }
  const normalized = reference.replace(/\\/g, '/');
  const candidates = [path.resolve(mapDirectory, normalized)];
  if (!path.isAbsolute(normalized)) {
    let directory = mapDirectory;
    while (true) {
      candidates.push(path.resolve(directory, 'Schemas', normalized), path.resolve(directory, 'Artifacts', 'Schemas', normalized));
      const parent = path.dirname(directory);
      if (parent === directory) {
        break;
      }
      directory = parent;
    }
  }
  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  throw new Error(`Could not resolve LML schema "${reference}". Keep its Schemas folder with the original map before importing.`);
}

export function getLmlSchemaDependencies(filePath: string, content: string): string[] {
  let references: string[];
  if (path.extname(filePath).toLowerCase() === '.json') {
    const root: unknown = JSON.parse(content);
    references = [];
    const visit = (value: unknown): void => {
      if (!value || typeof value !== 'object') {
        return;
      }
      for (const [key, child] of Object.entries(value)) {
        if (key === '$id') {
          throw new Error(`JSON schema base identities require additional import support: ${filePath}`);
        }
        if (key === '$ref' && typeof child === 'string' && !child.startsWith('#')) {
          references.push(decodeURIComponent(child.split('#')[0]));
        } else {
          visit(child);
        }
      }
    };
    visit(root);
  } else {
    const schema = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(content)?.schema;
    if (schema === undefined || schema.redefine !== undefined) {
      throw new Error(`Only XSD schemas without redefine are supported by this initial LML importer: ${filePath}`);
    }
    references = getSchemaDependencyLocations(content);
    const dependencies = [schema.import, schema.include].flatMap((value) =>
      value === undefined ? [] : Array.isArray(value) ? value : [value]
    );
    if (dependencies.some((entry: Record<string, unknown>) => !entry['@_schemaLocation'])) {
      throw new Error(`An XSD dependency has no schemaLocation: ${filePath}`);
    }
  }
  for (const reference of references) {
    if (path.isAbsolute(reference) || /^[a-z][a-z0-9+.-]*:/i.test(reference)) {
      throw new Error(`External schema dependency is not supported by this initial LML importer: ${reference}`);
    }
  }
  return references;
}

export function getLmlSchemaReferences(content: string): string[] {
  const document = parseDocument(content, { uniqueKeys: false, strict: false });
  if (!isMap(document.contents)) {
    throw new Error('LML must contain a mapping to resolve its schemas.');
  }
  return ['$sourceSchema', '$targetSchema'].flatMap((key) => {
    const value: unknown = document.get(key);
    if (value === undefined) {
      return [];
    }
    if (typeof value !== 'string' || !value.trim()) {
      throw new Error(`LML requires a non-empty ${key} string.`);
    }
    return [value];
  });
}

export function planLmlImport(mapPath: string): MapImportPlan {
  const content = readTextFileSync(mapPath);
  if (content === undefined) {
    throw new Error(`Could not read "${mapPath}".`);
  }
  const document = parseDocument(content, { uniqueKeys: false, keepSourceTokens: true });
  if (document.errors.length || !isMap(document.contents)) {
    throw new Error(`Invalid LML document: ${document.errors[0]?.message ?? 'expected a mapping'}`);
  }
  const root = document.contents;
  const headers = ['$sourceSchema', '$targetSchema'].map((key) => {
    const pairs = root.items.filter((pair) => isScalar(pair.key) && pair.key.value === key);
    const value = pairs[0]?.value;
    if (pairs.length !== 1 || !isScalar(value) || typeof value.value !== 'string' || !value.value || !value.range) {
      throw new Error(`LML requires exactly one non-empty ${key} string.`);
    }
    return { reference: value.value, range: value.range };
  });
  const schemas = planSchemaCollectionImport(
    headers.map((header) => resolveSchema(path.dirname(mapPath), header.reference)),
    getLmlSchemaDependencies
  );
  if (schemas.warnings.length) {
    throw new Error(`LML schema dependencies could not be imported: ${schemas.warnings.join(' ')}`);
  }
  const replacements = headers.map((header, index) => ({ range: header.range, value: JSON.stringify(schemas.rootRelativePaths[index]) }));
  let mapContent = content;
  for (const replacement of replacements.sort((left, right) => right.range[0] - left.range[0])) {
    mapContent = mapContent.slice(0, replacement.range[0]) + replacement.value + mapContent.slice(replacement.range[1]);
  }
  return { mapName: path.basename(mapPath, path.extname(mapPath)), mapContent, schemaFiles: schemas.schemaFiles, warnings: [] };
}
