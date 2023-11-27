import type { MapDefinitionEntry } from './MapDefinition';
import type { MapMetadata } from './MapMetadata';
import type { SchemaType } from './Schema';

type InitializeData = { project: string };
type FetchSchemaData = { fileName: string; type: SchemaType };
type SchemaPathData = { path: string; type: SchemaType };

export type MapDefinitionData = {
  mapDefinition: MapDefinitionEntry;
  sourceSchemaFileName: string;
  targetSchemaFileName: string;
  metadata: MapMetadata | undefined;
};
export type XsltData = { filename: string; fileContents: string };

export type MessageToWebview =
  | { command: 'initialize-frame'; data: InitializeData }
  | { command: 'fetchSchema'; data: FetchSchemaData }
  | { command: 'loadDataMap'; data: MapDefinitionData }
  | { command: 'showAvailableSchemas'; data: string[] }
  | { command: 'getAvailableCustomXsltPaths'; data: string[] }
  | { command: 'setXsltData'; data: XsltData }
  | { command: 'setRuntimePort'; data: string }
  | { command: 'getConfigurationSetting'; data: boolean };

export type MessageToVsix =
  | {
      command: 'initialize';
      data: any;
    }
  | {
      command: 'addSchemaFromFile';
      data: SchemaPathData;
    }
  | {
      command: 'saveDataMapDefinition' | 'saveDraftDataMapDefinition' | 'saveDataMapXslt' | 'saveDataMapMetadata';
      data: string;
    }
  | {
      command: 'webviewLoaded' | 'readLocalSchemaFileOptions' | 'readLocalCustomXsltFileOptions';
    }
  | {
      command: 'webviewRscLoadError';
      data: string;
    }
  | {
      command: 'setIsMapStateDirty';
      data: boolean;
    }
  | {
      command: 'getFunctionDisplayExpanded';
    };
