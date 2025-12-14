import type { OpenAPIV2 } from '../../../utils/src';

type CyclicalRefMetadata = {
  type: string;
};

export type DereferencedDocument = OpenAPIV2.Document & {
  $refs?: Record<string, CyclicalRefMetadata>;
};

/**
 * Dereferences local $ref pointers in a Swagger/OpenAPI document.
 * Only handles local JSON Pointer references (e.g., "#/definitions/MyType").
 * Does not resolve external file or URL references.
 *
 * Cyclical references are detected and kept as $ref pointers.
 * Metadata about cyclical refs is added to the result.$refs property.
 *
 * @param swagger - The Swagger document to dereference
 * @returns The dereferenced document with optional $refs metadata for cyclical references
 */
export function dereferenceSwagger(swagger: OpenAPIV2.Document): DereferencedDocument {
  const resolvingRefs = new Set<string>();
  const cyclicalRefs: Record<string, CyclicalRefMetadata> = {};

  /**
   * Decodes JSON Pointer escape sequences per RFC 6901.
   * ~1 → / (slash)
   * ~0 → ~ (tilde)
   * Note: ~1 must be decoded before ~0 to handle ~01 correctly
   */
  function decodeJsonPointer(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
  }

  function resolveRef(refPath: string): unknown {
    // Parse JSON pointer: "#/definitions/User" → ["definitions", "User"]
    const parts = refPath.replace(/^#\//, '').split('/').map(decodeJsonPointer);
    let current: unknown = swagger;

    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }
    return current;
  }

  function processValue(value: unknown): unknown {
    if (value === null || typeof value !== 'object') {
      return value;
    }

    if (Array.isArray(value)) {
      return value.map((item) => processValue(item));
    }

    const obj = value as Record<string, unknown>;

    // Handle $ref
    if (typeof obj['$ref'] === 'string' && obj['$ref'].startsWith('#/')) {
      const refPath = obj['$ref'];

      // Detect cycle - if we're already resolving this ref, it's cyclical
      if (resolvingRefs.has(refPath)) {
        const resolved = resolveRef(refPath) as Record<string, unknown> | undefined;
        const refType = (resolved?.['type'] as string) || 'object';
        cyclicalRefs[refPath] = { type: refType };
        return { $ref: refPath }; // Keep the $ref as-is
      }

      // Mark as resolving before recursing
      resolvingRefs.add(refPath);
      const resolved = resolveRef(refPath);

      // If resolution failed (undefined), keep the original $ref
      if (resolved === undefined) {
        resolvingRefs.delete(refPath);
        return { $ref: refPath };
      }

      const processed = processValue(resolved);
      resolvingRefs.delete(refPath);

      return processed;
    }

    // Process all properties
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = processValue(val);
    }
    return result;
  }

  const dereferenced = processValue(swagger) as DereferencedDocument;

  // Add metadata for cyclical refs if any were found
  if (Object.keys(cyclicalRefs).length > 0) {
    dereferenced.$refs = cyclicalRefs;
  }

  return dereferenced;
}
