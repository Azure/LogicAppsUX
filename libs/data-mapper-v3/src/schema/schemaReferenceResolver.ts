import * as path from 'path';
import { XMLParser } from 'fast-xml-parser';

function normalizeArtifactName(value: string): string {
  return value
    .replace(/\.xsd$/i, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();
}

export function getGlobalSchemaRootNames(schemaXml: string): string[] {
  const parsed = new XMLParser({
    ignoreAttributes: false,
    removeNSPrefix: true,
  }).parse(schemaXml);
  const elements = parsed?.schema?.element;
  return (Array.isArray(elements) ? elements : elements ? [elements] : [])
    .map((element: Record<string, unknown>) => String(element['@_name'] || ''))
    .filter(Boolean);
}

export function resolveLooseSchemaReference(
  schemaLocation: string,
  candidatePaths: string[],
  rootName?: string,
  readSchema?: (candidatePath: string) => string | undefined
): string | undefined {
  if (
    !schemaLocation ||
    schemaLocation.includes('/') ||
    schemaLocation.includes('\\')
  ) {
    return undefined;
  }

  const finalComponent = schemaLocation.slice(schemaLocation.lastIndexOf('.') + 1);
  const normalizedReference = normalizeArtifactName(schemaLocation);
  const normalizedFinalComponent = normalizeArtifactName(finalComponent);
  const normalizedWithoutSchemaSuffix = finalComponent.endsWith('Schema')
    ? normalizeArtifactName(finalComponent.slice(0, -6))
    : '';
  const uniqueCandidates = new Map<string, string>();
  for (const candidatePath of candidatePaths) {
    const resolvedPath = path.resolve(candidatePath);
    const key =
      process.platform === 'win32' ? resolvedPath.toLowerCase() : resolvedPath;
    if (!uniqueCandidates.has(key)) {
      uniqueCandidates.set(key, resolvedPath);
    }
  }
  const matches = [...uniqueCandidates.values()].filter((candidatePath) => {
    const candidate = normalizeArtifactName(path.basename(candidatePath));
    return (
      candidate === normalizedReference ||
      candidate === normalizedFinalComponent ||
      candidate.endsWith(normalizedFinalComponent) ||
      (!!normalizedWithoutSchemaSuffix &&
        (candidate === normalizedWithoutSchemaSuffix ||
          candidate.endsWith(normalizedWithoutSchemaSuffix)))
    );
  });

  if (matches.length === 1) {
    return matches[0];
  }
  if (matches.length <= 1 || !rootName || !readSchema) {
    return undefined;
  }

  const rootMatches = matches.filter((candidatePath) => {
    const schemaXml = readSchema(candidatePath);
    return schemaXml
      ? getGlobalSchemaRootNames(schemaXml).includes(rootName)
      : false;
  });
  return rootMatches.length === 1 ? rootMatches[0] : undefined;
}
