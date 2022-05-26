import { useGetMapQuery } from '../state/DataMapApi';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';

export const DataMapperStandaloneDesigner = () => {
  const dataMap = useGetMapQuery('').data;

  return (
    <DataMapperDesignerProvider locale="en-US" options={{}}>
      <DataMapDataProvider dataMap={dataMap || ''}>
        <DataMapperDesigner></DataMapperDesigner>
      </DataMapDataProvider>
    </DataMapperDesignerProvider>
  );
};
