import type { MapDefinitionEntry } from './MapDefinition';
import type { MapMetadata } from './MapMetadata';
import type { SchemaType } from './Schema';
import type { ExtensionCommand } from '@microsoft/vscode-extension';

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
  | { command: typeof ExtensionCommand.initialize_frame; data: InitializeData }
  | { command: typeof ExtensionCommand.fetchSchema; data: FetchSchemaData }
  | { command: typeof ExtensionCommand.loadDataMap; data: MapDefinitionData }
  | { command: typeof ExtensionCommand.showAvailableSchemas; data: string[] }
  | { command: typeof ExtensionCommand.getAvailableCustomXsltPaths; data: string[] }
  | { command: typeof ExtensionCommand.setXsltData; data: XsltData }
  | { command: typeof ExtensionCommand.setRuntimePort; data: string }
  | { command: typeof ExtensionCommand.getConfigurationSetting; data: boolean };

export type MessageToVsix =
  | {
      command: typeof ExtensionCommand.addSchemaFromFile;
      data: SchemaPathData;
    }
  | {
      command:
        | typeof ExtensionCommand.saveDataMapDefinition
        | typeof ExtensionCommand.saveDraftDataMapDefinition
        | typeof ExtensionCommand.saveDataMapXslt
        | typeof ExtensionCommand.saveDataMapMetadata;
      data: string;
    }
  | {
      command:
        | typeof ExtensionCommand.initialize
        | typeof ExtensionCommand.webviewLoaded
        | typeof ExtensionCommand.readLocalSchemaFileOptions
        | typeof ExtensionCommand.readLocalCustomXsltFileOptions;
    }
  | {
      command: typeof ExtensionCommand.webviewRscLoadError;
      data: string;
    }
  | {
      command: typeof ExtensionCommand.setIsMapStateDirty;
      data: boolean;
    }
  | {
      command: typeof ExtensionCommand.getFunctionDisplayExpanded;
    };
