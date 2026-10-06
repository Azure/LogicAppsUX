import * as fs from 'fs';
import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';
import { resolveLooseSchemaReference } from './schemaReferenceResolver';

const stripBom = (text: string): string => (text.charCodeAt(0) === 0xfeff ? text.slice(1) : text);

export function readTextFileSync(filePath: string): string | undefined {
  try {
    const buffer = fs.readFileSync(filePath);
    if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
      return stripBom(buffer.toString('utf16le'));
    }
    if (buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff) {
      const swapped = Buffer.from(buffer);
      for (let index = 0; index < swapped.length - 1; index += 2) {
        [swapped[index], swapped[index + 1]] = [swapped[index + 1], swapped[index]];
      }
      return stripBom(swapped.toString('utf16le'));
    }
    return stripBom(buffer.toString('utf8'));
  } catch {
    return undefined;
  }
}

// Resolves a schema reference (from a .btm or an xs:import/xs:include) to a file path using BizTalk-style fallbacks.
// The returned path is not guaranteed to exist.
export function resolveSchemaFilePath(docDir: string, schemaLocation: string, rootName?: string): string {
  if (!schemaLocation) {
    return '';
  }
  if (path.isAbsolute(schemaLocation)) {
    return schemaLocation;
  }

  // Try exact match first
  let resolved = path.resolve(docDir, schemaLocation);
  if (fs.existsSync(resolved)) {
    return resolved;
  }

  // Try appending .xsd extension
  resolved = path.resolve(docDir, `${schemaLocation}.xsd`);
  if (fs.existsSync(resolved)) {
    return resolved;
  }

  // Try just the filename in the same directory (handles paths like
  // ".\Web References\localhost\Reference.xsd" when the XSD is alongside the BTM)
  const baseName = path.basename(schemaLocation);
  resolved = path.resolve(docDir, baseName);
  if (fs.existsSync(resolved)) {
    return resolved;
  }

  // Try basename with .xsd appended (when location lacks extension)
  if (!baseName.endsWith('.xsd')) {
    resolved = path.resolve(docDir, `${baseName}.xsd`);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  // Handle .NET fully-qualified type names used as schema references in BizTalk
  // e.g. "Microsoft.Samples.BizTalk.Litware.Schemas.EDI.X12_00401_850"
  if (schemaLocation.includes('.') && !schemaLocation.includes('/') && !schemaLocation.includes('\\')) {
    // Try the full dotted name + .xsd (e.g. "Microsoft.Samples...X12_00401_850.xsd")
    resolved = path.resolve(docDir, `${schemaLocation}.xsd`);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // Try the short name (last segment after final dot) + .xsd
    const lastDotIdx = schemaLocation.lastIndexOf('.');
    const shortName = schemaLocation.substring(lastDotIdx + 1);
    resolved = path.resolve(docDir, `${shortName}.xsd`);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    resolved = path.resolve(docDir, shortName);
    if (fs.existsSync(resolved)) {
      return resolved;
    }

    // BizTalk convention: type name often appends "Schema" to the filename
    // e.g. type "CSR_OrderRequestSchema" → file "CSR_OrderRequest.xsd"
    if (shortName.endsWith('Schema')) {
      const stripped = shortName.slice(0, -6); // remove "Schema" suffix
      resolved = path.resolve(docDir, `${stripped}.xsd`);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }

    // Scan the directory for any .xsd file whose name ends with the short name
    try {
      const files: string[] = fs.readdirSync(docDir);
      const match = files.find(
        (f: string) =>
          f.endsWith('.xsd') &&
          (f === `${schemaLocation}.xsd` ||
            f === `${shortName}.xsd` ||
            f.endsWith(`.${shortName}.xsd`) ||
            (shortName.endsWith('Schema') && f === `${shortName.slice(0, -6)}.xsd`))
      );
      if (match) {
        return path.resolve(docDir, match);
      }
    } catch {
      /* ignore read errors */
    }
  }

  // Try sibling directories (common BizTalk project layout)
  const parentDir = path.dirname(docDir);
  let siblingDirs: string[] = [];
  try {
    siblingDirs = fs
      .readdirSync(parentDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(parentDir, d.name));
  } catch {
    /* ignore */
  }

  for (const dir of siblingDirs) {
    resolved = path.join(dir, baseName);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
    if (!baseName.endsWith('.xsd')) {
      resolved = path.join(dir, `${baseName}.xsd`);
      if (fs.existsSync(resolved)) {
        return resolved;
      }
    }
    resolved = path.join(dir, schemaLocation);
    if (fs.existsSync(resolved)) {
      return resolved;
    }
  }

  const collectCandidatePaths = (directories: string[]): string[] =>
    directories.flatMap((directory) => {
      try {
        return fs
          .readdirSync(directory, { withFileTypes: true })
          .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.xsd'))
          .map((entry) => path.join(directory, entry.name));
      } catch {
        return [];
      }
    });

  const localMatch = resolveLooseSchemaReference(schemaLocation, collectCandidatePaths([docDir]), rootName, readTextFileSync);
  if (localMatch) {
    return localMatch;
  }

  const looseMatch = resolveLooseSchemaReference(schemaLocation, collectCandidatePaths(siblingDirs), rootName, readTextFileSync);
  if (looseMatch) {
    return looseMatch;
  }

  // Fallback
  return path.resolve(docDir, schemaLocation);
}

// Returns the schemaLocation of every xs:import / xs:include in a schema document.
export function getSchemaDependencyLocations(schemaXml: string): string[] {
  const parsed = new XMLParser({ ignoreAttributes: false, removeNSPrefix: true }).parse(schemaXml);
  const schema = parsed?.schema;
  if (!schema || typeof schema !== 'object') {
    return [];
  }
  const toArray = (value: unknown): Record<string, unknown>[] =>
    Array.isArray(value) ? value : value ? [value as Record<string, unknown>] : [];
  return [...toArray(schema.import), ...toArray(schema.include)].map((item) => String(item['@_schemaLocation'] ?? '')).filter(Boolean);
}
