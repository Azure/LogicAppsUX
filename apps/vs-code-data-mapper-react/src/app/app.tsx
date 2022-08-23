import { VSCodeContext } from '../WebViewMsgHandler';
import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useContext } from 'react';
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
  const availableSchemas = useSelector((state: RootState) => state.schemaDataLoader.availableSchemas);

  const saveStateCall = () => {
    console.log('App called to save Data Map');
  };

  const setSelectedSchemaFile = (selectedSchemaFile: SchemaFile) => {
    vscode.postMessage({
      command: 'readSelectedSchemaFile',
      data: selectedSchemaFile,
    });
  };

  return (
    <DataMapperDesignerProvider locale="en-US" options={{}}>
      <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={availableSchemas}>
        <DataMapperDesigner saveStateCall={saveStateCall} setSelectedSchemaFile={setSelectedSchemaFile} />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
