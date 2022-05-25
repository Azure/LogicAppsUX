import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import React, { useContext } from 'react';

export interface DataMapDataProviderProps {
  dataMap: string; // TODO Strongly type dataMap
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({ dataMap, children }) => {
  // TODO Deserialize designer graph
  return <>{children}</>;
};

export const DataMapDataProvider: React.FC<DataMapDataProviderProps> = (props) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
