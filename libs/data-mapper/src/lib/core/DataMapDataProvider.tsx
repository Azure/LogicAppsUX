import type { JsonInputStyle } from '../models/DataMap';
import type { Schema } from '../models/Schema';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { updateBreadcrumbForSchema } from './state/BreadcrumbSlice';
import { updateReactFlowForSchema } from './state/ReactFlowSlice';
import { setInputSchema, setOutputSchema } from './state/SchemaSlice';
import type { AppDispatch, RootState } from './state/Store';
import React, { useContext, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface DataMapDataProviderProps {
  dataMap?: JsonInputStyle;
  inputSchema?: Schema;
  outputSchema?: Schema;
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({ inputSchema, outputSchema, children }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { inputSchema: extendedInputSchema, outputSchema: extendedOutputSchema } = useSelector((state: RootState) => state.schema);

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
    dispatch(
      updateReactFlowForSchema({ inputSchema: extendedInputSchema?.schemaTreeRoot, outputSchema: extendedOutputSchema?.schemaTreeRoot })
    );
  }, [dispatch, extendedInputSchema, extendedOutputSchema]);

  useEffect(() => {
    dispatch(updateBreadcrumbForSchema({ schema: extendedOutputSchema, currentNode: extendedOutputSchema?.schemaTreeRoot }));
  }, [dispatch, extendedOutputSchema]);

  return <>{children}</>;
};

export const DataMapDataProvider: React.FC<DataMapDataProviderProps> = (props) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
