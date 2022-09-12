import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import {
  DataMapDataProvider,
  DataMapperDesigner,
  DataMapperDesignerProvider,
  defaultDataMapperApiServiceOptions,
  InitDataMapperApiService,
} from '@microsoft/logic-apps-data-mapper';
import { useSelector } from 'react-redux';

export const DataMapperStandaloneDesigner = () => {
  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);

  const schemaState = useSelector((state: RootState) => {
    return state.dataMapDataLoader;
  });

  InitDataMapperApiService({
    baseUrl: defaultDataMapperApiServiceOptions.baseUrl,
    resourceUrl: schemaState.resourcePath,
    accessToken: schemaState.armToken,
  });

  const saveStateCall = (dataMapDefinition: string) => {
    new Promise((resolve) => setTimeout(resolve, 10));
    console.log(dataMapDefinition);
  };

  return (
    <>
      <DevToolbox />
      <DataMapperDesignerProvider locale="en-US" options={{}}>
        <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={[]}>
          <DataMapperDesigner saveStateCall={saveStateCall} />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </>
  );
};
