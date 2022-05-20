
import { useSelector } from 'react-redux';
import { DataMapperDesignerProvider } from './DataMapperDesignerProvider';
import { useGetMapQuery } from './state/DataMapApi';
import type { RootState } from './state/Store';

export const DataMapperDesignerWrapper = () => {
  const dataMap = useGetMapQuery('').data;

  return (
      <DataMapperDesignerProvider locale="en-US" options={{ }}>
          <DataMapProvider dataMap={dataMap}>
            <Designer></Designer>
          </DataMapProvider>
      </DataMapperDesignerProvider>
  );
};
