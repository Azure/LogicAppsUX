import { ReactFlowProvider } from '@xyflow/react';
import type { FunctionData } from '../models/Function';
import { convertSchemaToSchemaExtended } from '../utils/Schema.Utils';
import { DataMapperWrappedContext } from './DataMapperDesignerContext';
import { changeTheme } from './state/AppSlice';
import { changeIsTestDisabledForOS, setInitialDataMap, setInitialSchema, setXsltContent, setXsltFilename } from './state/DataMapSlice';
import { loadCustomXsltFilePaths, loadFunctions } from './state/FunctionSlice';
import { setAvailableSchemas } from './state/SchemaSlice';
import { updateTestOutput } from './state/PanelSlice';
import type { AppDispatch } from './state/Store';
import type { MapDefinitionEntry, DataMapSchema, IFileSysTreeItem, MapMetadataV2 } from '@microsoft/logic-apps-shared';
import { Theme as ThemeType, SchemaType } from '@microsoft/logic-apps-shared';
import type React from 'react';
import { useContext, useEffect, useMemo, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { MapDefinitionDeserializer } from '../mapHandling/MapDefinitionDeserializer';
import { updateDeserializationMessages } from './state/ErrorsSlice';

export interface TestXsltTransformResult {
  success: boolean;
  outputXml?: string;
  error?: string;
  statusCode: number;
  statusText: string;
}

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
  testXsltTransformResult?: TestXsltTransformResult;
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
  testXsltTransformResult,
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

  // Track the last processed result to avoid processing stale or duplicate results
  const lastProcessedResultRef = useRef<TestXsltTransformResult | null>(null);

  // Handle XSLT transform test results from the extension host
  useEffect(() => {
    // Skip if no result or if we've already processed this exact result
    if (!testXsltTransformResult) {
      return;
    }

    // Check if this is the same result we already processed (prevents duplicate dispatches)
    const lastResult = lastProcessedResultRef.current;
    if (
      lastResult &&
      lastResult.success === testXsltTransformResult.success &&
      lastResult.outputXml === testXsltTransformResult.outputXml &&
      lastResult.error === testXsltTransformResult.error &&
      lastResult.statusCode === testXsltTransformResult.statusCode
    ) {
      return; // Skip duplicate result
    }

    // Store the current result as processed
    lastProcessedResultRef.current = testXsltTransformResult;

    if (testXsltTransformResult.success) {
      dispatch(
        updateTestOutput({
          response: {
            statusCode: testXsltTransformResult.statusCode,
            statusText: testXsltTransformResult.statusText,
            outputInstance: {
              $content: testXsltTransformResult.outputXml ?? '',
              '$content-type': 'application/xml',
            },
          },
        })
      );
    } else {
      dispatch(
        updateTestOutput({
          error: new Error(testXsltTransformResult.error ?? 'XSLT transformation failed'),
        })
      );
    }
  }, [dispatch, testXsltTransformResult]);

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
