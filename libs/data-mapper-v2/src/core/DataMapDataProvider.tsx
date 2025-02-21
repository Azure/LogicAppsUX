import { ReactFlowProvider } from '@xyflow/react';
import type { FunctionData } from '../models/Function';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { changeTheme } from './state/AppSlice';
import { changeIsTestDisabledForOS, setInitialDataMap, setInitialSchema, setXsltContent, setXsltFilename } from './state/DataMapSlice';
import { loadCustomXsltFilePaths, loadFunctions } from './state/FunctionSlice';
import { setAvailableSchemas } from './state/SchemaSlice';
import type { AppDispatch } from './state/Store';
import type { MapDefinitionEntry, DataMapSchema, IFileSysTreeItem, MapMetadataV2 } from '@microsoft/logic-apps-shared';
import { Theme as ThemeType, SchemaType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { MapDefinitionDeserializer } from '../mapHandling/MapDefinitionDeserializer';
import { updateDeserializationMessages } from './state/ErrorsSlice';

export interface DataMapDataProviderProps {
  xsltFilename?: string;
  xsltContent: string;
  mapDefinition?: MapDefinitionEntry;
  dataMapMetadata?: MapMetadataV2;
  sourceSchema?: DataMapSchema;
  targetSchema?: DataMapSchema;
  availableSchemas?: IFileSysTreeItem[];
  customXsltPaths?: IFileSysTreeItem[];
  fetchedFunctions?: FunctionData[];
  theme?: ThemeType;
  children?: React.ReactNode;
  isTestDisabledForOS?: boolean;
}

const DataProviderInner = ({
  xsltFilename,
  xsltContent,
  sourceSchema,
  targetSchema,
  availableSchemas,
  fetchedFunctions,
  customXsltPaths,
  mapDefinition,
  dataMapMetadata,
  isTestDisabledForOS,
  theme = ThemeType.Light,
  children,
}: DataMapDataProviderProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const extendedSourceSchema = useMemo(() => sourceSchema && convertSchemaToSchemaExtended(sourceSchema), [sourceSchema]);
  const extendedTargetSchema = useMemo(() => targetSchema && convertSchemaToSchemaExtended(targetSchema), [targetSchema]);

  useEffect(() => {
    dispatch(changeTheme(theme));
  }, [dispatch, theme]);

  useEffect(() => {
    dispatch(setXsltFilename(xsltFilename ?? ''));
    dispatch(setXsltContent(xsltContent ?? ''));
  }, [dispatch, xsltFilename, xsltContent]);

  useEffect(() => {
    if (extendedSourceSchema && extendedTargetSchema && fetchedFunctions && mapDefinition) {
      const mapDefinitionDeserializer = new MapDefinitionDeserializer(
        mapDefinition,
        extendedSourceSchema,
        extendedTargetSchema,
        fetchedFunctions
      );
      const connections = mapDefinitionDeserializer.convertFromMapDefinition();
      const warningMessages = mapDefinitionDeserializer.getWarningMessages();
      dispatch(updateDeserializationMessages(warningMessages));
      dispatch(
        setInitialDataMap({
          sourceSchema: extendedSourceSchema,
          targetSchema: extendedTargetSchema,
          dataMapConnections: connections,
          metadata: dataMapMetadata,
        })
      );
    }
  }, [dispatch, extendedSourceSchema, extendedTargetSchema, fetchedFunctions, mapDefinition, dataMapMetadata]);

  useEffect(() => {
    if (extendedSourceSchema) {
      dispatch(
        setInitialSchema({
          schema: extendedSourceSchema,
          schemaType: SchemaType.Source,
        })
      );
    }
  }, [dispatch, extendedSourceSchema]);

  useEffect(() => {
    if (extendedTargetSchema) {
      dispatch(
        setInitialSchema({
          schema: extendedTargetSchema,
          schemaType: SchemaType.Target,
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
    if (fetchedFunctions) {
      dispatch(loadFunctions(fetchedFunctions ?? []));
    }
  }, [dispatch, fetchedFunctions]);

  useEffect(() => {
    if (customXsltPaths) {
      dispatch(loadCustomXsltFilePaths(customXsltPaths ?? []));
    }
  }, [dispatch, customXsltPaths]);

  useEffect(() => {
    dispatch(changeIsTestDisabledForOS(!!isTestDisabledForOS));
  }, [dispatch, isTestDisabledForOS]);

  return <>{children}</>;
};

export const DataMapDataProvider = (props: DataMapDataProviderProps) => {
  const wrapped = useContext(DataMapperWrappedContext);
  if (!wrapped) {
    throw new Error('DataMapDataProvider must be used inside of a DataMapperWrappedContext');
  }

  return (
    <ReactFlowProvider>
      <DataProviderInner {...props} />
    </ReactFlowProvider>
  );
};
