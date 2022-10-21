import type { MapDefinitionEntry } from '../models/MapDefinition';
import type { Schema } from '../models/Schema';
import { SchemaTypes } from '../models/Schema';
import { convertFromMapDefinition } from '../utils/DataMap.Utils';
import { convertSchemaToSchemaExtended, flattenSchema } from '../utils/Schema.Utils';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { getFunctions } from './queries/functions';
import { setInitialDataMap, setInitialSchema, setXsltFilename } from './state/DataMapSlice';
import { loadFunctions } from './state/FunctionSlice';
import { setAvailableSchemas } from './state/SchemaSlice';
import type { AppDispatch, RootState } from './state/Store';
import React, { useContext, useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';

export interface DataMapDataProviderProps {
  xsltFilename?: string;
  mapDefinition?: MapDefinitionEntry;
  sourceSchema?: Schema;
  targetSchema?: Schema;
  availableSchemas?: string[];
  children?: React.ReactNode;
}

const DataProviderInner: React.FC<DataMapDataProviderProps> = ({
  xsltFilename,
  mapDefinition,
  sourceSchema,
  targetSchema,
  availableSchemas,
  children,
}) => {
  const dispatch = useDispatch<AppDispatch>();
  const extendedSourceSchema = useMemo(() => sourceSchema && convertSchemaToSchemaExtended(sourceSchema), [sourceSchema]);
  const extendedTargetSchema = useMemo(() => targetSchema && convertSchemaToSchemaExtended(targetSchema), [targetSchema]);
  const functions = useSelector((state: RootState) => state.function.availableFunctions);

  useEffect(() => {
    dispatch(setXsltFilename(xsltFilename ?? ''));
  }, [dispatch, xsltFilename]);

  useEffect(() => {
    if (mapDefinition && extendedSourceSchema && extendedTargetSchema) {
      const connections = convertFromMapDefinition(mapDefinition, extendedSourceSchema, extendedTargetSchema, functions);
      dispatch(setInitialDataMap(connections));
    }
  }, [dispatch, mapDefinition, extendedSourceSchema, extendedTargetSchema, functions]);

  useEffect(() => {
    if (extendedSourceSchema) {
      dispatch(
        setInitialSchema({
          schema: extendedSourceSchema,
          schemaType: SchemaTypes.Source,
          flattenedSchema: flattenSchema(extendedSourceSchema, SchemaTypes.Source),
        })
      );
    }
  }, [dispatch, extendedSourceSchema]);

  useEffect(() => {
    if (extendedTargetSchema) {
      dispatch(
        setInitialSchema({
          schema: extendedTargetSchema,
          schemaType: SchemaTypes.Target,
          flattenedSchema: flattenSchema(extendedTargetSchema, SchemaTypes.Target),
        })
      );
    }
  }, [dispatch, extendedTargetSchema]);

  useEffect(() => {
    if (availableSchemas) {
      dispatch(setAvailableSchemas(availableSchemas));
    }
  }, [dispatch, availableSchemas]);

  useEffect(() => {
    async function fetchFunctions() {
      dispatch(loadFunctions(await getFunctions()));
    }

    fetchFunctions();
  }, [dispatch]);

  return <>{children}</>;
};

export const DataMapDataProvider: React.FC<DataMapDataProviderProps> = (props) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return <DataProviderInner {...props} />;
};
