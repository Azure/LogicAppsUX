import * as fs from 'fs';
import * as path from 'path';
import { BtmSerializer } from './btmSerializer';
import { getSchemaDependencyLocations, readTextFileSync, resolveSchemaFilePath } from './schemaFileResolver';

export interface PlannedSchemaFile {
  // Posix path relative to the project's Schemas folder.
  relativePath: string;
  data: Buffer;
}

export interface MapImportPlan {
  mapName: string;
  mapContent: string;
  schemaFiles: PlannedSchemaFile[];
  warnings: string[];
}

interface SchemaEdge {
  location: string;
  resolvedPath: string;
}

interface SchemaClosureFile {
  filePath: string;
  edges: SchemaEdge[];
}

const isWindows = process.platform === 'win32';
const pathKey = (filePath: string): string => (isWindows ? path.resolve(filePath).toLowerCase() : path.resolve(filePath));
const isRemoteLocation = (location: string): boolean => /^[a-z][a-z0-9+.-]*:\/\//i.test(location);

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeXmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Collects a schema and everything it imports/includes, following references with the same resolution the editor uses.
function collectSchemaClosure(rootPath: string, closure: Map<string, SchemaClosureFile>, warnings: string[]): void {
  const key = pathKey(rootPath);
  if (closure.has(key)) {
    return;
  }
  const file: SchemaClosureFile = { filePath: path.resolve(rootPath), edges: [] };
  closure.set(key, file);

  const xml = readTextFileSync(rootPath);
  if (!xml) {
    warnings.push(`Could not read schema "${rootPath}".`);
    return;
  }

  let locations: string[];
  try {
    locations = getSchemaDependencyLocations(xml);
  } catch {
    warnings.push(`Could not parse schema "${path.basename(rootPath)}" to find its references.`);
    return;
  }

  for (const location of locations) {
    if (isRemoteLocation(location)) {
      continue;
    }
    const resolvedPath = resolveSchemaFilePath(path.dirname(rootPath), location);
    if (!fs.existsSync(resolvedPath)) {
      warnings.push(`Schema "${path.basename(rootPath)}" references "${location}", which could not be found.`);
      continue;
    }
    file.edges.push({ location, resolvedPath: path.resolve(resolvedPath) });
    collectSchemaClosure(resolvedPath, closure, warnings);
  }
}

function getCommonDirectory(filePaths: string[]): string | undefined {
  const split = (directory: string): string[] => path.resolve(directory).split(path.sep);
  const [first, ...rest] = filePaths.map((filePath) => split(path.dirname(filePath)));
  let common = first;
  for (const parts of rest) {
    let length = 0;
    while (
      length < common.length &&
      length < parts.length &&
      (isWindows ? common[length].toLowerCase() === parts[length].toLowerCase() : common[length] === parts[length])
    ) {
      length++;
    }
    common = common.slice(0, length);
  }
  if (common.length === 0) {
    return undefined;
  }
  const joined = common.join(path.sep);
  return joined === '' ? path.sep : joined.endsWith(':') ? `${joined}${path.sep}` : joined;
}

function rewriteSchemaLocations(xml: string, replacements: Map<string, string>): string {
  let result = xml;
  for (const [location, replacement] of replacements) {
    result = result.replace(new RegExp(`(schemaLocation\\s*=\\s*)(["'])${escapeRegExp(location)}\\2`, 'g'), `$1$2${replacement}$2`);
  }
  return result.replace(/(<\?xml[^?]*encoding\s*=\s*["'])utf-16[^"']*(["'])/i, '$1utf-8$2');
}

function rewriteTreeSchemaLocations(mapContent: string, treeTag: 'SrcTree' | 'TrgTree', replacements: Map<string, string>): string {
  const treePattern = new RegExp(`<${treeTag}\\b[\\s\\S]*?<\\/${treeTag}>`);
  return mapContent.replace(treePattern, (tree) => rewriteSchemaLocations(tree, replacements));
}

function replaceTreeLocation(mapContent: string, treeTag: 'SrcTree' | 'TrgTree', location: string): string {
  const treePattern = new RegExp(`<${treeTag}\\b[\\s\\S]*?<\\/${treeTag}>`);
  return mapContent.replace(treePattern, (tree) =>
    tree.replace(/(<Reference\b[^>]*?\bLocation\s*=\s*)(["'])[^"']*\2/, `$1"${escapeXmlAttribute(location)}"`)
  );
}

// Lays a schema closure out under a common folder and rewrites references that only resolved through a fallback lookup.
function buildSchemaFiles(closure: Map<string, SchemaClosureFile>): {
  schemaFiles: PlannedSchemaFile[];
  relativePaths: Map<string, string>;
} {
  const files = [...closure.values()];
  const commonDirectory = files.length > 0 ? getCommonDirectory(files.map((file) => file.filePath)) : undefined;
  if (files.length > 0 && !commonDirectory) {
    throw new Error('The schemas used by this map are on different drives and cannot be copied into a single Schemas folder.');
  }

  const relativePaths = new Map<string, string>();
  for (const file of files) {
    relativePaths.set(
      pathKey(file.filePath),
      path
        .relative(commonDirectory as string, file.filePath)
        .split(path.sep)
        .join('/')
    );
  }

  const schemaFiles: PlannedSchemaFile[] = files.map((file) => {
    const relativePath = relativePaths.get(pathKey(file.filePath)) as string;
    // A reference that only resolved through a fallback lookup must be repointed at the copied dependency.
    const replacements = new Map<string, string>();
    for (const edge of file.edges) {
      const literalPath = path.resolve(path.dirname(file.filePath), edge.location);
      if (pathKey(literalPath) === pathKey(edge.resolvedPath)) {
        continue;
      }
      const dependencyRelativePath = relativePaths.get(pathKey(edge.resolvedPath)) as string;
      const rewritten = path.posix.relative(path.posix.dirname(relativePath), dependencyRelativePath);
      replacements.set(edge.location, rewritten);
    }
    if (replacements.size === 0) {
      return { relativePath, data: fs.readFileSync(file.filePath) };
    }
    const xml = readTextFileSync(file.filePath) ?? '';
    return { relativePath, data: Buffer.from(rewriteSchemaLocations(xml, replacements), 'utf8') };
  });
  return { schemaFiles, relativePaths };
}

export interface SchemaImportPlan {
  // Posix path of the requested schema relative to the project's Schemas folder.
  rootRelativePath: string;
  schemaFiles: PlannedSchemaFile[];
  warnings: string[];
}

// Builds the set of files needed to bring a single schema into a mapper project: the schema and everything it imports/includes.
export function planSchemaImport(schemaPath: string): SchemaImportPlan {
  const warnings: string[] = [];
  const closure = new Map<string, SchemaClosureFile>();
  collectSchemaClosure(schemaPath, closure, warnings);
  const { schemaFiles, relativePaths } = buildSchemaFiles(closure);
  const rootRelativePath = relativePaths.get(pathKey(schemaPath));
  if (!rootRelativePath) {
    throw new Error(`Could not read "${schemaPath}".`);
  }
  return { rootRelativePath, schemaFiles, warnings };
}

// Builds the set of files needed to bring a .btm into a mapper project: the map itself with its schema references
// repointed at the Schemas folder, plus each referenced schema and its imports in their original relative layout.
export function planMapImport(btmPath: string): MapImportPlan {
  const mapContent = readTextFileSync(btmPath);
  if (mapContent === undefined) {
    throw new Error(`Could not read "${btmPath}".`);
  }
  const map = new BtmSerializer().deserialize(mapContent);
  const warnings: string[] = [];
  const btmDirectory = path.dirname(btmPath);

  const closure = new Map<string, SchemaClosureFile>();
  const sides = [
    { label: 'source', treeTag: 'SrcTree' as const, reference: map.sourceSchema },
    { label: 'target', treeTag: 'TrgTree' as const, reference: map.targetSchema },
  ];
  const rootPaths = new Map<'SrcTree' | 'TrgTree', string>();
  // Inline schemas (e.g. multi-part aggregates) embed imports that are relative to the original map location.
  const inlineEdges: { treeTag: 'SrcTree' | 'TrgTree'; location: string; resolvedPath: string }[] = [];
  for (const side of sides) {
    if (!side.reference.location && side.reference.inlineSchemaXml) {
      let locations: string[] = [];
      try {
        locations = getSchemaDependencyLocations(side.reference.inlineSchemaXml);
      } catch {
        warnings.push(`Could not parse the inline ${side.label} schema to find its references.`);
      }
      for (const location of locations) {
        if (isRemoteLocation(location)) {
          continue;
        }
        const resolvedPath = resolveSchemaFilePath(btmDirectory, location);
        if (!fs.existsSync(resolvedPath)) {
          warnings.push(`The inline ${side.label} schema references "${location}", which could not be found.`);
          continue;
        }
        inlineEdges.push({ treeTag: side.treeTag, location, resolvedPath: path.resolve(resolvedPath) });
        collectSchemaClosure(resolvedPath, closure, warnings);
      }
      continue;
    }
    if (!side.reference.location) {
      continue;
    }
    const resolvedPath = resolveSchemaFilePath(btmDirectory, side.reference.location, side.reference.rootName);
    if (!fs.existsSync(resolvedPath)) {
      warnings.push(`The ${side.label} schema "${side.reference.location}" could not be found; its original reference was kept.`);
      continue;
    }
    rootPaths.set(side.treeTag, path.resolve(resolvedPath));
    collectSchemaClosure(resolvedPath, closure, warnings);
  }

  const { schemaFiles, relativePaths } = buildSchemaFiles(closure);

  let updatedMapContent = mapContent;
  for (const [treeTag, rootPath] of rootPaths) {
    updatedMapContent = replaceTreeLocation(updatedMapContent, treeTag, `Schemas/${relativePaths.get(pathKey(rootPath))}`);
  }
  for (const treeTag of ['SrcTree', 'TrgTree'] as const) {
    const replacements = new Map<string, string>();
    for (const edge of inlineEdges.filter((candidate) => candidate.treeTag === treeTag)) {
      replacements.set(edge.location, `Schemas/${relativePaths.get(pathKey(edge.resolvedPath))}`);
    }
    if (replacements.size > 0) {
      updatedMapContent = rewriteTreeSchemaLocations(updatedMapContent, treeTag, replacements);
    }
  }
  updatedMapContent = updatedMapContent.replace(/(<\?xml[^?]*encoding\s*=\s*["'])utf-16[^"']*(["'])/i, '$1utf-8$2');

  return {
    mapName: path.basename(btmPath, path.extname(btmPath)),
    mapContent: updatedMapContent,
    schemaFiles,
    warnings,
  };
}
