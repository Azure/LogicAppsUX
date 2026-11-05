import type { MapDefinitionEntry } from '@microsoft/logic-apps-shared';
import { isScalar, parseDocument, visit } from 'yaml';

export function loadMap(mapText: string): MapDefinitionEntry {
  if (!mapText.trim()) {
    return {};
  }
  const document = parseDocument(mapText.replaceAll('"', '\\"'), { strict: false, uniqueKeys: false });
  visit(document, {
    Pair(_key, pair) {
      if (isScalar(pair.key) && typeof pair.key.value === 'string' && /^\$(?:for|if)(?:\s|\(|$)/.test(pair.key.value)) {
        pair.key.value = `${crypto.randomUUID()}-${pair.key.value}`;
      }
    },
  });
  if (document.errors.length) {
    throw document.errors[0];
  }
  const map: unknown = document.toJS();
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
