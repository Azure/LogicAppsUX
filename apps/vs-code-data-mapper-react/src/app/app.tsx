import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';

// TODO - Load data map
export const App = () => {
  return (
    <DataMapperDesignerProvider locale="en-US" options={{}}>
      <DataMapDataProvider dataMap={''}>
        <DataMapperDesigner></DataMapperDesigner>
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
