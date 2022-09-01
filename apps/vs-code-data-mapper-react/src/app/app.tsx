import { VSCodeContext } from '../WebViewMsgHandler';
import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useCallback, useContext } from 'react';
import { useSelector } from 'react-redux';

interface SchemaFile {
  path: string;
  type: 'input' | 'output';
}

export const App = (): JSX.Element => {
  const vscode = useContext(VSCodeContext);

  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);
  const schemaFileList = useSelector((state: RootState) => state.schemaDataLoader.schemaFileList);

  const saveStateCall = (dataMapDefinition: string) => {
    saveDataMapDefinition(dataMapDefinition);
  };

  const addSchemaFromFile = (selectedSchemaFile: SchemaFile) => {
    vscode.postMessage({
      command: 'addSchemaFromFile',
      data: { path: selectedSchemaFile.path, type: selectedSchemaFile.type },
    });
  };

  const readLocalFileOptions = useCallback(() => {
    vscode.postMessage({
      command: 'readLocalFileOptions',
    });
  }, [vscode]);

  const saveDataMapDefinition = (dataMapDefinition: string) => {
    vscode.postMessage({
      command: 'saveDataMapDefinition',
      data: dataMapDefinition,
    });
  };

  return (
    <DataMapperDesignerProvider locale="en-US" options={{}}>
      <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={schemaFileList}>
        <DataMapperDesigner
          saveStateCall={saveStateCall}
          addSchemaFromFile={addSchemaFromFile}
          readCurrentSchemaOptions={readLocalFileOptions}
        />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
