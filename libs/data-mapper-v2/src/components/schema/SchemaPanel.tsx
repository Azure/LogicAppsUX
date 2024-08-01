/* eslint-disable @typescript-eslint/no-unused-vars */
import { DataMapperFileService, getSelectedSchema } from '../../core';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import { closePanel, openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { convertSchemaToSchemaExtended, flattenSchemaNodeMap, getFileNameAndPath } from '../../utils/Schema.Utils';
import { equals, type SchemaNodeExtended, SchemaType, type DataMapSchema } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useStyles } from './styles';
import { Panel } from '../../components/common/panel/Panel';
import { SchemaPanelBody } from './SchemaPanelBody';
import type { SchemaFile } from '../../models/Schema';
import { mergeClasses } from '@fluentui/react-components';
import type { FileSelectorOption } from '../common/selector/FileSelector';
import Fuse from 'fuse.js';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

const fuseSchemaSearchOptions: Fuse.IFuseOptions<SchemaNodeExtended> = {
  includeScore: true,
  minMatchCharLength: 1,
  includeMatches: true,
  threshold: 0.4,
  ignoreLocation: true,
  keys: ['name', 'qName'],
};

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  schemaType: SchemaType;
}

export const SchemaPanel = ({ onSubmitSchemaFileSelection, schemaType }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();
  const fileService = DataMapperFileService();

  const curDataMapOperation = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation);
  const currentPanelView = useSelector((state: RootState) => {
    return state.panel.currentPanelView;
  });

  const [fileSelectorOptions, setFileSelectorOptions] = useState<FileSelectorOption>('select-existing');
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [selectedSchema, _setSelectedSchema] = useState<DataMapSchema>();
  const [errorMessage, setErrorMessage] = useState('');

  const schemaFromStore = useSelector((state: RootState) => {
    return schemaType === SchemaType.Source
      ? state.dataMap.present.curDataMapOperation.sourceSchema
      : state.dataMap.present.curDataMapOperation.targetSchema;
  });

  const flattenedScehmaMap = useMemo(
    () => (schemaFromStore ? flattenSchemaNodeMap(schemaFromStore.schemaTreeRoot) : {}),
    [schemaFromStore]
  );

  const [filteredFlattenedScehmaMap, setFilteredFlattenedScehmaMap] = useState(flattenedScehmaMap);

  const showScehmaSelection = useMemo(() => !schemaFromStore, [schemaFromStore]);

  const fetchSchema = useQuery(
    [selectedSchemaFile],
    async () => {
      if (selectedSchema && selectedSchemaFile) {
        const [fileName, filePath] = getFileNameAndPath(selectedSchemaFile?.path);
        const schema = await getSelectedSchema(fileName ?? '', filePath);
        return schema;
      }
      const schema = await getSelectedSchema(selectedSchemaFile?.name ?? '', selectedSchemaFile?.path ?? '');
      return schema;
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedSchemaFile !== undefined,
    }
  );

  const { isSuccess, data, error } = fetchSchema;

  useEffect(() => {
    if (isSuccess && data && schemaType) {
      const extendedSchema = convertSchemaToSchemaExtended(data);
      dispatch(setInitialSchema({ schema: extendedSchema, schemaType: schemaType }));
    }
  }, [dispatch, schemaType, data, isSuccess]);

  const stringResources = useMemo(
    () => ({
      SELECT_EXISTING: intl.formatMessage({
        defaultMessage: 'Select existing',
        id: '2ZfzaY',
        description: 'Select existing option',
      }),
      SOURCE: intl.formatMessage({
        defaultMessage: 'Source',
        id: 'nODesn',
        description: 'Source',
      }),
      DESTINATION: intl.formatMessage({
        defaultMessage: 'Destination',
        id: 'EXEL2j',
        description: 'Destination',
      }),
      SEARCH_PROPERTIES: intl.formatMessage({
        defaultMessage: 'Search properties',
        id: 'BnkCwH',
        description: 'Seach source or target properties',
      }),
    }),
    [intl]
  );

  const genericErrorMsg = intl.formatMessage({
    defaultMessage: 'Failed to load the schema. Please try again.',
    id: '6fDYzG',
    description: 'Load schema error message',
  });

  const goBackToDefaultConfigPanelView = useCallback(() => {
    dispatch(openDefaultConfigPanelView());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const closeEntirePanel = useCallback(() => {
    dispatch(closePanel());
    setErrorMessage('');
  }, [dispatch, setErrorMessage]);

  const onSubmitSchema = useCallback(
    (schema: DataMapSchema) => {
      if (schemaType) {
        const extendedSchema = convertSchemaToSchemaExtended(schema);
        dispatch(setInitialSchema({ schema: extendedSchema, schemaType: schemaType }));
      }
    },
    [dispatch, schemaType]
  );

  // this is not being used yet
  const addOrUpdateSchema = useCallback(
    (isAddSchema?: boolean) => {
      if (schemaType === undefined) {
        return;
      }

      LogService.log(LogCategory.AddOrUpdateSchemaView, 'addOrChangeSchema', {
        message: `${isAddSchema ? 'Added' : 'Changed'} ${schemaType} schema from ${
          fileSelectorOptions === 'select-existing' ? 'existing schema files' : 'new file upload'
        }`,
      });

      // Catch specific errors from GET schemaTree or otherwise
      const schemaLoadError = error;
      if (schemaLoadError) {
        if (typeof schemaLoadError === 'string') {
          setErrorMessage(schemaLoadError);
          LogService.error(LogCategory.AddOrUpdateSchemaView, 'schemaLoadError', {
            message: schemaLoadError,
          });
        } else if (schemaLoadError instanceof Error) {
          setErrorMessage(schemaLoadError.message);
          LogService.error(LogCategory.AddOrUpdateSchemaView, 'schemaLoadError', {
            message: schemaLoadError.message,
          });
        }

        return;
      }

      if (fileSelectorOptions === 'select-existing' && selectedSchema) {
        onSubmitSchema(selectedSchema);
      } else if (fileSelectorOptions === 'upload-new' && selectedSchemaFile) {
        onSubmitSchemaFileSelection(selectedSchemaFile);
      }

      if (selectedSchema || selectedSchemaFile) {
        isAddSchema ? closeEntirePanel() : goBackToDefaultConfigPanelView();
        setErrorMessage('');
      } else {
        setErrorMessage(genericErrorMsg);
      }
    },
    [
      schemaType,
      closeEntirePanel,
      goBackToDefaultConfigPanelView,
      genericErrorMsg,
      selectedSchemaFile,
      fileSelectorOptions,
      onSubmitSchemaFileSelection,
      error,
      onSubmitSchema,
      selectedSchema,
    ]
  );

  const onSearchChange = useCallback(
    (searchTerm?: string) => {
      if (flattenedScehmaMap && searchTerm) {
        if (!searchTerm) {
          setFilteredFlattenedScehmaMap({ ...flattenedScehmaMap });
          return;
        }

        const allSchemaNodes = Object.values(flattenedScehmaMap);
        const parentSet = new Set<string>();
        const fuse = new Fuse(allSchemaNodes, fuseSchemaSearchOptions);

        const findParent = (node: SchemaNodeExtended, parentSet: Set<string>) => {
          if (node.parentKey && !parentSet.has(node.parentKey)) {
            parentSet.add(node.parentKey);
            findParent(flattenedScehmaMap[node.parentKey], parentSet);
          }
        };

        const filteredNodes = fuse.search(searchTerm).map((result) => result.item);

        // Along with the filter results, also add in the root nodes
        const filteredFlattenedScehmaMap = filteredNodes.reduce(
          (acc, node) => {
            acc[node.key] = node;
            return acc;
          },
          {} as Record<string, SchemaNodeExtended>
        );

        for (const node of filteredNodes) {
          findParent(node, parentSet);
        }

        for (const parentKey of parentSet) {
          const parent = flattenedScehmaMap[parentKey];
          if (parent) {
            filteredFlattenedScehmaMap[parentKey] = parent;
          }
        }

        setFilteredFlattenedScehmaMap(filteredFlattenedScehmaMap);
      }
    },
    [flattenedScehmaMap, setFilteredFlattenedScehmaMap]
  );

  // if initial flat-map changes, filtered version needs to be reset
  useEffect(() => {
    setFilteredFlattenedScehmaMap(flattenedScehmaMap);
  }, [setFilteredFlattenedScehmaMap, flattenedScehmaMap]);

  // Read current schema file options if method exists
  useEffect(() => {
    if (fileService && fileService.readCurrentSchemaOptions) {
      fileService.readCurrentSchemaOptions();
    }
  }, [fileService]);

  return (
    <Panel
      id={`panel_${schemaType}`}
      isOpen={!!currentPanelView}
      title={{
        text: equals(schemaType, SchemaType.Source) ? stringResources.SOURCE : stringResources.DESTINATION,
      }}
      search={
        showScehmaSelection
          ? undefined
          : {
              placeholder: stringResources.SEARCH_PROPERTIES,
              onChange: onSearchChange,
            }
      }
      styles={{
        root: mergeClasses(styles.root, showScehmaSelection ? styles.rootWithSchemaSelection : styles.rootWithSchemaTree),
      }}
      body={
        <SchemaPanelBody
          schemaType={schemaType}
          selectedSchema={selectedSchema?.name}
          setSelectedSchemaFile={setSelectedSchemaFile}
          selectedSchemaFile={selectedSchemaFile}
          errorMessage={errorMessage}
          fileSelectorOptions={fileSelectorOptions}
          setFileSelectorOptions={setFileSelectorOptions}
          showScehmaSelection={showScehmaSelection}
          flattenedSchemaMap={filteredFlattenedScehmaMap}
        />
      }
    />
  );
};
