import type { MapDefinitionEntry } from './MapDefinition';
import type { SchemaType } from './Schema';

type FetchSchemaData = { fileName: string; type: SchemaType };
type SchemaPathData = { path: string; type: SchemaType };

export type MapDefinitionData = { mapDefinition: MapDefinitionEntry; sourceSchemaFileName: string; targetSchemaFileName: string };

export type MessageToWebview =
  | { command: 'fetchSchema'; data: FetchSchemaData }
  | { command: 'loadDataMap'; data: MapDefinitionData }
  | { command: 'showAvailableSchemas'; data: string[] }
  | { command: 'setXsltFilename'; data: string }
  | { command: 'setRuntimePort'; data: string };

export type MessageToVsix =
  | {
      command: 'addSchemaFromFile';
      data: SchemaPathData;
    }
  | {
      command: 'saveDataMapDefinition' | 'saveDraftDataMapDefinition' | 'saveDataMapXslt';
      data: string;
    }
  | {
      command: 'webviewLoaded' | 'readLocalFileOptions';
    }
  | {
      command: 'webviewRscLoadError';
      data: string;
    }
  | {
      command: 'setIsMapStateDirty';
      data: boolean;
    };
