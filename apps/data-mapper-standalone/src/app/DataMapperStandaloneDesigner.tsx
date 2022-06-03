import { DevToolbox } from '../components/DevToolbox';
import type { RootState } from '../state/Store';
import { DataMapDataProvider, DataMapperDesigner, DataMapperDesignerProvider } from '@microsoft/logic-apps-data-mapper';
import { useSelector } from 'react-redux';

export const DataMapperStandaloneDesigner = () => {
  const dataMap = useSelector((state: RootState) => state.dataMapDataLoader.dataMap);

  return (
    <>
      <DevToolbox />
      <DataMapperDesignerProvider locale="en-US" options={{}}>
        <DataMapDataProvider dataMap={dataMap}>
          <DataMapperDesigner />
        </DataMapDataProvider>
      </DataMapperDesignerProvider>
    </>
  );
};
