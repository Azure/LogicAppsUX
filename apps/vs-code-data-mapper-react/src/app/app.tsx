import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useSelector } from 'react-redux';

export const App = (): JSX.Element => {
  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);
  const inputSchema = useSelector((state: RootState) => state.schemaDataLoader.inputSchema);
  const outputSchema = useSelector((state: RootState) => state.schemaDataLoader.outputSchema);
  const availableSchemas = useSelector((state: RootState) => state.schemaDataLoader.availableSchemas);

  const saveStateCall = () => {
    console.log('App called to save Data Map');
  };

  return (
    <DataMapperDesignerProvider locale="en-US" options={{}}>
      <DataMapDataProvider dataMap={dataMap} inputSchema={inputSchema} outputSchema={outputSchema} availableSchemas={availableSchemas}>
        <DataMapperDesigner saveStateCall={saveStateCall} />
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
