import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import type { Schema } from '@microsoft/logic-apps-data-mapper';
import { useSelector } from 'react-redux';

export const DataMapperStandaloneDesigner = () => {
  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);
  // const availableSchemas = useSelector((state: RootState) => state.schemaDataLoader.availableSchemas);
  const availableSchemas: Schema[] = [];

  return (
    <>
      <DevToolbox />
      <DataMapperDesignerProvider locale="en-US" options={{}}>
        <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={availableSchemas}>
          <DataMapperDesigner />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </>
  );
};
