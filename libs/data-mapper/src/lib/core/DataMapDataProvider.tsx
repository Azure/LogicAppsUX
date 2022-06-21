import type { JsonInputStyle } from '../models/DataMap';
import type { Schema } from '../models/Schema';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { setAvailableSchemas, setInputSchema, setOutputSchema } from './state/SchemaSlice';
import type { AppDispatch } from './state/Store';
import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

export interface DataMapDataProviderProps {
  dataMap?: JsonInputStyle;
  inputSchema?: Schema;
  outputSchema?: Schema;
  availableSchemas?: Schema[];
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({ inputSchema, outputSchema, availableSchemas, children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (inputSchema) {
      dispatch(setInputSchema(inputSchema));
    }
  }, [dispatch, inputSchema]);

  useEffect(() => {
    if (outputSchema) {
      dispatch(setOutputSchema(outputSchema));
    }
  }, [dispatch, outputSchema]);

  useEffect(() => {
    if (availableSchemas) {
      dispatch(setAvailableSchemas(availableSchemas));
    }
  }, [dispatch, availableSchemas]);

  return <>{children}</>;
};

export const DataMapDataProvider: React.FC<DataMapDataProviderProps> = (props) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
