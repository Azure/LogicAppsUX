import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  InitSchemaSelectionService,
} from '@microsoft/logic-apps-data-mapper';
import { useSelector } from 'react-redux';

export const DataMapperStandaloneDesigner = () => {
  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);
  const availableSchemas = useSelector((state: RootState) => state.schemaDataLoader.availableSchemas);

  const schemaState = useSelector((state: RootState) => {
    return state.dataMapDataLoader;
  });

  const baseUrl = 'https://management.azure.com';
  InitSchemaSelectionService({ baseUrl: baseUrl, resourceUrl: schemaState.resourcePath, accessToken: schemaState.armToken });

  const saveStateCall = () => {
    new Promise((resolve) => setTimeout(resolve, 10));
    // console.log();
  };

  return (
    <>
      <DevToolbox />
      <DataMapperDesignerProvider locale="en-US" options={{}}>
        <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={availableSchemas}>
          <DataMapperDesigner saveStateCall={saveStateCall} />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </>
  );
};
