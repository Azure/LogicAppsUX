import type { DataMap } from '../models/DataMap';
import type { Schema } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { convertSchemaToSchemaExtended, flattenSchema } from '../utils/Schema.Utils';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { setInitialDataMap, setInitialSchema } from './state/DataMapSlice';
import { setAvailableSchemas } from './state/SchemaSlice';
import type { AppDispatch } from './state/Store';
import React, { useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

export interface DataMapDataProviderProps {
  dataMap?: DataMap;
  sourceSchema?: Schema;
  targetSchema?: Schema;
  availableSchemas?: string[];
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({ dataMap, sourceSchema, targetSchema, availableSchemas, children }) => {
  const dispatch = useDispatch<AppDispatch>();

  useEffect(() => {
    if (sourceSchema && targetSchema && dataMap) {
      dispatch(setInitialDataMap(dataMap));
    }
  }, [dispatch, dataMap, sourceSchema, targetSchema]);

  useEffect(() => {
    if (sourceSchema) {
      const extendedSchema = convertSchemaToSchemaExtended(sourceSchema);
      dispatch(
        setInitialSchema({
          schema: convertSchemaToSchemaExtended(sourceSchema),
          schemaType: SchemaTypes.Source,
          flattenedSchema: flattenSchema(extendedSchema, SchemaTypes.Source),
        })
      );
    }
  }, [dispatch, sourceSchema]);

  useEffect(() => {
    if (targetSchema) {
      const extendedSchema = convertSchemaToSchemaExtended(targetSchema);
      dispatch(
        setInitialSchema({
          schema: extendedSchema,
          schemaType: SchemaTypes.Target,
          flattenedSchema: flattenSchema(extendedSchema, SchemaTypes.Target),
        })
      );
    }
  }, [dispatch, targetSchema]);

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
