import type { MapDefinitionEntry } from '@microsoft/logic-apps-shared';
import { parse, parseDocument } from 'yaml';

export function loadMap(mapText: string): MapDefinitionEntry {
  if (!mapText.trim()) {
    return {};
  }
  const escaped = mapText
    .replaceAll('"', '\\"')
    .replaceAll('$for', () => `${crypto.randomUUID()}-$for`)
    .replaceAll('$if', () => `${crypto.randomUUID()}-$if`);
  const map: unknown = parse(escaped, { strict: false, uniqueKeys: false });
  if (!map || typeof map !== 'object' || Array.isArray(map)) {
    throw new Error('The LML document must contain a mapping.');
  }
  restoreCustomValues(map);
  const headers = parseDocument(mapText, { strict: false, uniqueKeys: false });
  for (const key of ['$sourceSchema', '$targetSchema']) {
    const schemaPath: unknown = headers.get(key);
    if (schemaPath !== undefined) {
      if (typeof schemaPath !== 'string' || !schemaPath.trim()) {
        throw new Error(`Invalid LML schema header: ${key}`);
      }
      (map as Record<string, unknown>)[key] = schemaPath;
    }
  }
  return map as MapDefinitionEntry;
}

function restoreCustomValues(value: object): void {
  for (const [key, child] of Object.entries(value)) {
    if (child && typeof child === 'object') {
      restoreCustomValues(child);
    } else if (typeof child === 'string') {
      (value as Record<string, unknown>)[key] = child.replaceAll('\\"', '"');
    }
  }
}
