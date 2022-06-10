import type { JsonInputStyle } from '../models/DataMap';
import type { Schema } from '../models/Schema';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { updateReactFlowForSchema } from './state/ReactFlowSlice';
import type { AppDispatch } from './state/Store';
import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

export interface DataMapDataProviderProps {
  dataMap?: JsonInputStyle;
  inputSchema?: Schema;
  outputSchema?: Schema;
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({ inputSchema, outputSchema, children }) => {
  const dispatch = useDispatch<AppDispatch>();
  useEffect(() => {
    dispatch(updateReactFlowForSchema({ inputSchema: inputSchema?.schemaTreeRoot, outputSchema: outputSchema?.schemaTreeRoot }));
  }, [dispatch, inputSchema, outputSchema]);

  return <>{children}</>;
};

export const DataMapDataProvider: React.FC<DataMapDataProviderProps> = (props) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
