import type { OpenAPIV2 } from '../../../../utils/src';

type SchemaObject = OpenAPIV2.SchemaObject;

/**
 * Resolves local `$ref` pointers in a standalone JSON schema (not a Swagger doc).
 * Handles both `$defs` (JSON Schema Draft 2019-09+) and `definitions` (Draft 4/7).
 *
 * This is used to dereference user-provided schemas (e.g., from Parse JSON action or
 * Request trigger) so that titles, descriptions, and other metadata from referenced
 * definitions are preserved and displayed in the UI.
 *
 * Cyclical references are detected and kept as-is to prevent infinite recursion.
 * External/URL `$ref` values are left unchanged.
 *
 * @param schema - The JSON schema to dereference
 * @returns A new schema with all local `$ref` pointers resolved inline
 */
export function dereferenceJsonSchema(schema: SchemaObject): SchemaObject {
  if (!schema || typeof schema !== 'object') {
    return schema;
  }

  // Get the definitions container - support both $defs (2019-09+) and definitions (Draft 4/7)
  const defs: Record<string, SchemaObject> | undefined = schema.$defs ?? schema.definitions;

  // If there are no definitions, nothing to resolve
  if (!defs || typeof defs !== 'object' || Object.keys(defs).length === 0) {
    return schema;
  }

  const resolvingRefs = new Set<string>();

  /**
   * Resolves a local JSON Pointer reference against the root schema.
   * Supports paths like:
   *   - #/$defs/MyType
   *   - #/definitions/MyType
   */
  function resolveRef(refPath: string): SchemaObject | undefined {
    // Only handle local references
    if (!refPath.startsWith('#/')) {
      return undefined;
    }

    const parts = refPath
      .replace(/^#\//, '')
      .split('/')
      .map(decodeJsonPointer);

    let current: unknown = schema;
    for (const part of parts) {
      if (current === null || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[part];
    }

    return current as SchemaObject | undefined;
  }

  /**
   * Decodes JSON Pointer escape sequences per RFC 6901.
   * ~1 -> / (slash), ~0 -> ~ (tilde)
   * ~1 must be decoded before ~0 to handle ~01 correctly.
   */
  function decodeJsonPointer(segment: string): string {
    return segment.replace(/~1/g, '/').replace(/~0/g, '~');
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
    if (typeof obj['$ref'] === 'string') {
      const refPath = obj['$ref'];

      // Only resolve local references
      if (!refPath.startsWith('#/')) {
        return obj;
      }

      // Detect cycle
      if (resolvingRefs.has(refPath)) {
        // For cyclical refs, return an object schema with no known properties
        return { type: 'object' };
      }

      resolvingRefs.add(refPath);
      const resolved = resolveRef(refPath);

      if (resolved === undefined) {
        // Can't resolve - keep original $ref
        resolvingRefs.delete(refPath);
        return obj;
      }

      const processed = processValue(resolved);
      resolvingRefs.delete(refPath);
      return processed;
    }

    // Process all properties recursively
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      // Skip the $defs/definitions containers themselves to avoid unnecessary processing
      if (key === '$defs' || key === 'definitions') {
        continue;
      }
      result[key] = processValue(val);
    }
    return result;
  }

  return processValue(schema) as SchemaObject;
}
