import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { create } from 'xmlbuilder2';
import { XMLValidator } from 'fast-xml-parser';
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
  artifactFiles?: PlannedSchemaFile[];
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

function escapeXmlAttribute(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

// Collects a schema and everything it imports/includes, following references with the same resolution the editor uses.
function collectSchemaClosure(
  rootPath: string,
  closure: Map<string, SchemaClosureFile>,
  warnings: string[],
  getDependencies?: (filePath: string, content: string) => string[]
): void {
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
    locations = getDependencies ? getDependencies(rootPath, xml) : getSchemaDependencyLocations(xml);
  } catch (error) {
    if (getDependencies) {
      throw error;
    }
    warnings.push(`Could not parse schema "${path.basename(rootPath)}" to find its references.`);
    return;
  }

  for (const location of locations) {
    if (isRemoteLocation(location)) {
      continue;
    }
    const resolvedPath = getDependencies
      ? path.resolve(path.dirname(rootPath), location.replace(/\\/g, path.sep))
      : resolveSchemaFilePath(path.dirname(rootPath), location);
    if (!fs.existsSync(resolvedPath)) {
      warnings.push(`Schema "${path.basename(rootPath)}" references "${location}", which could not be found.`);
      continue;
    }
    file.edges.push({ location, resolvedPath: path.resolve(resolvedPath) });
    collectSchemaClosure(resolvedPath, closure, warnings, getDependencies);
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
  const encodedReplacements = new Map<string, string>();
  for (const [location, replacement] of replacements) {
    const encodedLocation = escapeXmlAttribute(location).replace(/'/g, '&apos;');
    encodedReplacements.set(location, replacement);
    encodedReplacements.set(escapeXmlAttribute(location), replacement);
    encodedReplacements.set(encodedLocation, replacement);
  }
  const result = xml.replace(/(\bschemaLocation\s*=\s*)(["'])(.*?)\2/g, (match, prefix, quote, location) => {
    const replacement = encodedReplacements.get(location);
    return replacement === undefined ? match : `${prefix}${quote}${escapeXmlAttribute(replacement).replace(/'/g, '&apos;')}${quote}`;
  });
  return result.replace(/(<\?xml[^?]*encoding\s*=\s*["'])utf-16[^"']*(["'])/i, '$1utf-8$2');
}

function rewriteTreeSchemaLocations(mapContent: string, treeTag: 'SrcTree' | 'TrgTree', replacements: Map<string, string>): string {
  const treePattern = new RegExp(`<${treeTag}\\b[\\s\\S]*?<\\/${treeTag}>`);
  return mapContent.replace(treePattern, (tree) => rewriteSchemaLocations(tree, replacements));
}

function replaceTreeLocation(mapContent: string, treeTag: 'SrcTree' | 'TrgTree', location: string): string {
  const treePattern = new RegExp(`<${treeTag}\\b[\\s\\S]*?<\\/${treeTag}>`);
  return mapContent.replace(treePattern, (tree) =>
    tree.replace(/(<Reference\b[^>]*?\bLocation\s*=\s*)(["'])[^"']*\2/, (_match, prefix) => `${prefix}"${escapeXmlAttribute(location)}"`)
  );
}

function buildArtifactFiles(
  btmDirectory: string,
  stylesheetLocation: string | undefined,
  extensionLocation: string | undefined,
  mapName: string,
  warnings: string[]
): { artifactFiles: PlannedSchemaFile[]; locations: Map<string, string> } {
  const files = new Map<string, { filePath: string; data: Buffer; document?: ReturnType<typeof create> }>();
  const references: {
    filePath: string;
    baseDirectory: string;
    directory: boolean;
    suffix: string;
    filesystemPath?: boolean;
    rewrite: (value: string) => void;
  }[] = [];
  const basePaths: string[] = [];
  let totalBytes = 0;
  const resolveLocation = (location: string, baseUri: URL): URL | undefined => {
    const normalized = location.replace(/\\/g, '/');
    const uri =
      path.win32.isAbsolute(location) || path.isAbsolute(location)
        ? pathToFileURL(path.resolve(location.replace(/[\\/]/g, path.sep)))
        : new URL(normalized, baseUri);
    if (uri.protocol !== 'file:') {
      warnings.push(`Custom artifact reference "${location}" is not a local file and was not copied.`);
      return undefined;
    }
    return uri;
  };
  const collect = (filePath: string, kind: 'stylesheet' | 'extension' | 'data'): void => {
    const key = pathKey(filePath);
    let file = files.get(key);
    if (!file) {
      const data = fs.readFileSync(filePath);
      totalBytes += data.length;
      if (files.size >= 512 || totalBytes > 128 * 1024 * 1024) {
        throw new Error('Custom artifact dependencies exceed the import limit of 512 files or 128 MB.');
      }
      file = { filePath, data };
      files.set(key, file);
    }
    if (kind === 'data' || file.document) {
      return;
    }
    const content = readTextFileSync(filePath);
    if (content === undefined || XMLValidator.validate(content) !== true) {
      throw new Error(`Could not parse custom artifact "${filePath}".`);
    }
    const document = create(content);
    file.document = document;
    const root = document.root().node.ownerDocument!.documentElement!;
    const fileUri = pathToFileURL(filePath);
    const visit = (element: typeof root, parentUri: URL): void => {
      let baseUri = parentUri;
      const xmlBase = element.getAttributeNS('http://www.w3.org/XML/1998/namespace', 'base');
      if (xmlBase) {
        const resolved = resolveLocation(xmlBase, parentUri);
        if (!resolved) {
          return;
        }
        baseUri = resolved;
        references.push({
          filePath: fileURLToPath(baseUri),
          baseDirectory: fileURLToPath(new URL('.', parentUri)),
          directory: baseUri.pathname.endsWith('/'),
          suffix: baseUri.search + baseUri.hash,
          rewrite: (value) => element.setAttribute('xml:base', value),
        });
      }
      const baseDirectory = fileURLToPath(new URL('.', baseUri));
      basePaths.push(path.join(baseDirectory, '.base'));
      const addReference = (
        location: string,
        dependencyKind: 'stylesheet' | 'extension' | 'data',
        rewrite: (value: string) => void,
        filesystemPath = false
      ): void => {
        if (!location) {
          return;
        }
        const referenceBaseDirectory = filesystemPath ? path.dirname(filePath) : baseDirectory;
        const uri = filesystemPath
          ? pathToFileURL(path.resolve(referenceBaseDirectory, location.replace(/[\\/]/g, path.sep)))
          : resolveLocation(location, baseUri);
        if (!uri) {
          return;
        }
        let resolvedPath = fileURLToPath(uri);
        if (kind === 'extension' && !fs.existsSync(resolvedPath) && fs.existsSync(`${resolvedPath}.dll`)) {
          resolvedPath += '.dll';
        }
        references.push({
          filePath: resolvedPath,
          baseDirectory: referenceBaseDirectory,
          directory: false,
          suffix: uri.search + uri.hash,
          filesystemPath,
          rewrite,
        });
        collect(resolvedPath, dependencyKind);
      };
      if (kind === 'stylesheet') {
        if (element.namespaceURI === 'http://www.w3.org/1999/XSL/Transform' && ['include', 'import'].includes(element.localName)) {
          const href = element.getAttribute('href');
          if (href) {
            addReference(href, 'stylesheet', (value) => element.setAttribute('href', value));
          }
        }
        for (const attribute of Array.from(element.attributes)) {
          if (
            attribute.namespaceURI === 'http://www.w3.org/2000/xmlns/' ||
            attribute.namespaceURI === 'http://www.w3.org/XML/1998/namespace'
          ) {
            continue;
          }
          const value = attribute.value;
          const isXPath =
            element.namespaceURI === 'http://www.w3.org/1999/XSL/Transform' &&
            [
              'select',
              'test',
              'match',
              'use',
              'count',
              'from',
              'value',
              'group-by',
              'group-adjacent',
              'group-starting-with',
              'group-ending-with',
              'initial-value',
            ].includes(attribute.localName);
          const expressions = isXPath
            ? [{ text: value, offset: 0 }]
            : [...value.matchAll(/\{\{|\}\}|\{((?:"[^"]*"|'[^']*'|[^{}])*)\}/g)]
                .filter((match) => match[1] !== undefined)
                .map((match) => ({ text: match[1], offset: match.index! + 1 }));
          const edits: { start: number; end: number; value: string }[] = [];
          for (const expression of expressions) {
            const tokens = expression.text.matchAll(/"(?:[^"]|"")*"|'(?:[^']|'')*'|(?<![\w.:-])(?:fn:)?(?:document|doc)\s*\(/g);
            for (const token of tokens) {
              if (token[0].startsWith('"') || token[0].startsWith("'")) {
                continue;
              }
              const argument = expression.text
                .slice(token.index! + token[0].length)
                .match(/^\s*(?:'((?:[^']|'')*)'|"((?:[^"]|"")*)")\s*\)/);
              if (!argument) {
                warnings.push(`Stylesheet "${filePath}" contains a dynamic document() reference; copy its additional resources manually.`);
                continue;
              }
              const location = argument[1] !== undefined ? argument[1].replace(/''/g, "'") : argument[2].replace(/""/g, '"');
              const start = expression.offset + token.index! + token[0].length;
              const quote = argument[1] !== undefined ? "'" : '"';
              addReference(location, 'data', (replacement) => {
                edits.push({ start, end: start + argument[0].length, value: `${quote}${replacement}${quote})` });
                let updated = value;
                for (const edit of [...edits].sort((left, right) => right.start - left.start)) {
                  updated = updated.slice(0, edit.start) + edit.value + updated.slice(edit.end);
                }
                element.setAttribute(attribute.name, updated);
              });
            }
          }
        }
      }
      const assemblyAttribute =
        kind === 'extension' && element.localName === 'ExtensionObject'
          ? 'AssemblyName'
          : kind === 'stylesheet' && element.namespaceURI === 'urn:schemas-microsoft-com:xslt' && element.localName === 'assembly'
            ? 'name'
            : undefined;
      if (assemblyAttribute) {
        const assemblyName = element.getAttribute(assemblyAttribute);
        if (assemblyName && (/[\\/]/.test(assemblyName) || /\.(dll|exe)$/i.test(assemblyName))) {
          addReference(assemblyName, 'data', (value) => element.setAttribute(assemblyAttribute, value), true);
        }
      }
      for (const child of Array.from(element.childNodes)) {
        if (child?.nodeType === 1) {
          visit(child as typeof root, baseUri);
        }
      }
    };
    visit(root, fileUri);
  };
  const roots = new Map<string, string>();
  for (const [attribute, location, kind] of [
    ['XsltPath', stylesheetLocation, 'stylesheet'],
    ['ExtObjXmlPath', extensionLocation, 'extension'],
  ] as const) {
    if (!location) {
      continue;
    }
    const filePath = path.resolve(btmDirectory, location.replace(/[\\/]/g, path.sep));
    roots.set(attribute, filePath);
    collect(filePath, kind);
  }
  if (files.size === 0) {
    return { artifactFiles: [], locations: new Map() };
  }
  const commonDirectory = getCommonDirectory([...files.values()].map((file) => file.filePath).concat(basePaths));
  if (!commonDirectory) {
    throw new Error('The custom artifacts used by this map are on different drives and cannot be copied together.');
  }
  for (const reference of references) {
    const relative =
      path
        .relative(reference.baseDirectory, reference.filePath)
        .split(path.sep)
        .map((part) => (reference.filesystemPath ? part : encodeURIComponent(part).replace(/'/g, '%27')))
        .join('/') || '.';
    reference.rewrite(`${relative}${reference.directory && !relative.endsWith('/') ? '/' : ''}${reference.suffix}`);
  }
  const relativePath = (filePath: string): string => `${mapName}/${path.relative(commonDirectory, filePath).split(path.sep).join('/')}`;
  return {
    artifactFiles: [...files.values()].map((file) => ({
      relativePath: relativePath(file.filePath),
      data: file.document
        ? Buffer.from(file.document.end().replace(/(<\?xml[^?]*encoding\s*=\s*["'])utf-16[^"']*(["'])/i, '$1utf-8$2'), 'utf8')
        : file.data,
    })),
    locations: new Map([...roots].map(([attribute, filePath]) => [attribute, `Artifacts/${relativePath(filePath)}`])),
  };
}

// Lays a schema closure out under a common folder and rewrites references that only resolved through a fallback lookup.
function buildSchemaFiles(
  closure: Map<string, SchemaClosureFile>,
  destinationPaths?: Map<string, string>
): {
  schemaFiles: PlannedSchemaFile[];
  relativePaths: Map<string, string>;
} {
  const files = [...closure.values()];
  const commonDirectory = files.length > 0 ? getCommonDirectory(files.map((file) => file.filePath)) : undefined;
  if (!destinationPaths && files.length > 0 && !commonDirectory) {
    throw new Error('The schemas used by this map are on different drives and cannot be copied into a single Schemas folder.');
  }

  const relativePaths = new Map<string, string>(destinationPaths);
  for (const file of files) {
    if (destinationPaths) {
      continue;
    }
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
      const location = edge.location.replace(/[\\/]/g, path.sep);
      const literalPath = path.resolve(path.dirname(file.filePath), location);
      const dependencyRelativePath = relativePaths.get(pathKey(edge.resolvedPath)) as string;
      const rewritten = path.posix.relative(path.posix.dirname(relativePath), dependencyRelativePath);
      if (
        destinationPaths
          ? location.split(path.sep).join('/') === rewritten
          : !path.isAbsolute(location) && !path.win32.isAbsolute(edge.location) && pathKey(literalPath) === pathKey(edge.resolvedPath)
      ) {
        continue;
      }
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

function buildFlatSchemaFiles(
  closure: Map<string, SchemaClosureFile>,
  mapName: string,
  schemasDirectory: string
): {
  schemaFiles: PlannedSchemaFile[];
  relativePaths: Map<string, string>;
} {
  const files = [...closure.values()];
  const relativePaths = new Map(files.map((file) => [pathKey(file.filePath), path.basename(file.filePath)]));
  const existing = new Map<string, { name: string; data?: Buffer }>();
  if (fs.existsSync(schemasDirectory)) {
    for (const entry of fs.readdirSync(schemasDirectory, { withFileTypes: true })) {
      existing.set(entry.name.toLowerCase(), {
        name: entry.name,
        data: entry.isFile() ? fs.readFileSync(path.join(schemasDirectory, entry.name)) : undefined,
      });
    }
  }
  for (let pass = 0; pass <= files.length + 1; pass++) {
    let changed = false;
    const planned = new Map<string, { name: string; data?: Buffer }>(existing);
    const rendered = buildSchemaFiles(closure, relativePaths);
    for (const [index, file] of files.entries()) {
      const key = pathKey(file.filePath);
      let name = path.basename(file.filePath);
      const data = rendered.schemaFiles[index].data;
      const extension = path.extname(file.filePath);
      const stem = path.basename(file.filePath, extension);
      for (let suffix = 0; ; suffix++) {
        const collision = planned.get(name.toLowerCase());
        if (!collision || (collision.data && collision.data.equals(data))) {
          name = collision?.name ?? name;
          break;
        }
        name = `${stem}_${mapName}${suffix === 0 ? '' : `(${suffix})`}${extension}`;
      }
      if (relativePaths.get(key) !== name) {
        relativePaths.set(key, name);
        changed = true;
      }
      planned.set(name.toLowerCase(), { name, data });
    }
    if (!changed) {
      const uniqueFiles = new Map<string, PlannedSchemaFile>();
      for (const file of rendered.schemaFiles) {
        if (!existing.get(file.relativePath.toLowerCase())?.data?.equals(file.data)) {
          uniqueFiles.set(file.relativePath.toLowerCase(), file);
        }
      }
      return { schemaFiles: [...uniqueFiles.values()], relativePaths };
    }
  }
  throw new Error('Could not resolve schema filename conflicts without changing existing schemas.');
}

export interface SchemaImportPlan {
  // Posix path of the requested schema relative to the project's Schemas folder.
  rootRelativePath: string;
  schemaFiles: PlannedSchemaFile[];
  warnings: string[];
}

export function planSchemaCollectionImport(
  schemaPaths: string[],
  getDependencies?: (filePath: string, content: string) => string[]
): {
  schemaFiles: PlannedSchemaFile[];
  rootRelativePaths: string[];
  warnings: string[];
} {
  const warnings: string[] = [];
  const closure = new Map<string, SchemaClosureFile>();
  for (const schemaPath of schemaPaths) {
    collectSchemaClosure(schemaPath, closure, warnings, getDependencies);
  }
  const { schemaFiles, relativePaths } = buildSchemaFiles(closure);
  return {
    schemaFiles,
    rootRelativePaths: schemaPaths.map((schemaPath) => relativePaths.get(pathKey(schemaPath)) as string),
    warnings,
  };
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
export function planMapImport(
  btmPath: string,
  mapContentOverride?: string,
  options?: { destinationMapName: string; schemasDirectory?: string }
): MapImportPlan {
  const destinationMapName = options?.destinationMapName;
  if (
    destinationMapName !== undefined &&
    (!destinationMapName ||
      /[<>:"/\\|?*]/.test(destinationMapName) ||
      [...destinationMapName].some((character) => character.charCodeAt(0) < 32) ||
      /^\.+$/.test(destinationMapName) ||
      /[. ]$/.test(destinationMapName))
  ) {
    throw new Error('The imported map name must be a valid folder name.');
  }
  const mapContent = mapContentOverride ?? readTextFileSync(btmPath);
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

  const { schemaFiles, relativePaths } =
    destinationMapName && options?.schemasDirectory
      ? buildFlatSchemaFiles(closure, destinationMapName, options.schemasDirectory)
      : buildSchemaFiles(closure);

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
  let artifactFiles: PlannedSchemaFile[] | undefined;
  if (destinationMapName) {
    const artifacts = buildArtifactFiles(btmDirectory, map.customXsltPath, map.customExtensionXmlPath, destinationMapName, warnings);
    artifactFiles = artifacts.artifactFiles;
    updatedMapContent = updatedMapContent.replace(/<CustomXSLT\b[^>]*>/, (element) => {
      for (const [attribute, location] of artifacts.locations) {
        element = element.replace(
          new RegExp(`(\\b${attribute}\\s*=\\s*)(["'])[^"']*\\2`),
          (_match, prefix) => `${prefix}"${escapeXmlAttribute(location)}"`
        );
      }
      return element;
    });
  }
  updatedMapContent = updatedMapContent.replace(/(<\?xml[^?]*encoding\s*=\s*["'])utf-16[^"']*(["'])/i, '$1utf-8$2');

  return {
    mapName: path.basename(btmPath, path.extname(btmPath)),
    mapContent: updatedMapContent,
    schemaFiles,
    ...(artifactFiles ? { artifactFiles } : {}),
    warnings,
  };
}
