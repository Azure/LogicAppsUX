import type { OpenAPIV2 } from '@microsoft/logic-apps-shared';
export declare const getTitleOrSummary: (schema: OpenAPIV2.SchemaObject) => string | undefined;
export declare const isOneOf: (schema: OpenAPIV2.SchemaObject) => boolean;
