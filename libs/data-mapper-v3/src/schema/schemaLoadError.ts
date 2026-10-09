import type { SchemaTree } from '../model/schemaModel';
import type { SchemaLoadError, SchemaSide } from '../protocol/mapEditorProtocol';

export interface SchemaLoadResult {
  tree?: SchemaTree;
  error?: unknown;
}

export class SchemaNotFoundError extends Error {
  public constructor(public readonly location: string) {
    super(`Schema file not found: ${location}`);
    this.name = 'SchemaNotFoundError';
  }
}

export function describeSchemaLoadError(
  side: SchemaSide,
  reference: { location?: string; inlineSchemaXml?: string },
  error: unknown
): SchemaLoadError {
  const label = reference.location || '(inline schema)';
  if (error instanceof SchemaNotFoundError) {
    return {
      reference: label,
      message: `Cannot resolve the ${side} schema reference "${label}". No matching schema file was found next to the map or in the workspace.`,
    };
  }
  const detail = error instanceof Error ? error.message : String(error);
  return { reference: label, message: `Cannot load the ${side} schema "${label}": ${detail}` };
}
