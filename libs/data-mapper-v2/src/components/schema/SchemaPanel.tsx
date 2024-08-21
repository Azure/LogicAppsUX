import { DataMapperFileService, getSelectedSchema } from '../../core';
import { setInitialSchema, toggleSourceEditState, toggleTargetEditState } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { convertSchemaToSchemaExtended, flattenSchemaNodeMap, getFileNameAndPath } from '../../utils/Schema.Utils';
import { equals, type SchemaNodeExtended, SchemaType } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { useStyles } from './styles';
import { Panel } from '../../components/common/panel/Panel';
import { SchemaPanelBody } from './SchemaPanelBody';
import type { SchemaFile } from '../../models/Schema';
import { Button, mergeClasses } from '@fluentui/react-components';
import type { FileSelectorOption } from '../common/selector/FileSelector';
import Fuse from 'fuse.js';
import { EditRegular } from '@fluentui/react-icons';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

const fuseSchemaSearchOptions: Fuse.IFuseOptions<SchemaNodeExtended> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.5,
  ignoreLocation: true,
  keys: ['name', 'qName'],
};

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  schemaType: SchemaType;
}

export const SchemaPanel = ({ schemaType }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();
  const styles = useStyles();
  const fileService = DataMapperFileService();
  const [fileSelectorOptions, setFileSelectorOptions] = useState<FileSelectorOption>('select-existing');
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, _setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const isLeftDirection = useMemo(() => equals(schemaType, SchemaType.Source), [schemaType]);

  const { sourceChildParentMapping, targetChildParentMapping } = useSelector(
    (state: RootState) => state.dataMap.present.curDataMapOperation
  );
  const currentPanelView = useSelector((state: RootState) => {
    return state.panel.currentPanelView;
  });
  const { sourceInEditState, targetInEditState } = useSelector((state: RootState) => state.dataMap.present);
  const selectedSchema = useSelector((state: RootState) => {
    if (schemaType === SchemaType.Source) {
      return state.dataMap.present.curDataMapOperation.sourceSchema;
    }
    if (schemaType === SchemaType.Target) {
      return state.dataMap.present.curDataMapOperation.targetSchema;
    }
    return undefined;
  });

  const flattenedScehmaMap = useMemo(() => (selectedSchema ? flattenSchemaNodeMap(selectedSchema.schemaTreeRoot) : {}), [selectedSchema]);

  const [filteredFlattenedScehmaMap, setFilteredFlattenedScehmaMap] = useState(flattenedScehmaMap);

  const scehmaInEditState = useMemo(
    () => (isLeftDirection ? sourceInEditState : targetInEditState),
    [isLeftDirection, sourceInEditState, targetInEditState]
  );

  const fetchSchema = useQuery(
    [selectedSchemaFile],
    async () => {
      if (selectedSchema && selectedSchemaFile) {
        const [fileName, filePath] = getFileNameAndPath(selectedSchemaFile?.path);
        const schema = await getSelectedSchema(fileName ?? '', filePath);
        return schema;
      }
      const updatedSchema = await getSelectedSchema(selectedSchemaFile?.name ?? '', selectedSchemaFile?.path ?? '');
      return updatedSchema;
    },
    {
      ...schemaFileQuerySettings,
      enabled: selectedSchemaFile !== undefined,
    }
  );

  const { isSuccess, data } = fetchSchema;

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
      EDIT_SCHEMA: intl.formatMessage({
        defaultMessage: 'Edit schema',
        id: 'KqJ14/',
        description: 'Edit scehma',
      }),
      GENERIC_ERROR: intl.formatMessage({
        defaultMessage: 'Failed to load the schema. Please try again.',
        id: '6fDYzG',
        description: 'Load schema error message',
      }),
    }),
    [intl]
  );

  const onSearchChange = useCallback(
    (newSearchTerm?: string) => {
      setSearchTerm(newSearchTerm ?? '');
      if (flattenedScehmaMap) {
        if (!newSearchTerm) {
          setFilteredFlattenedScehmaMap({ ...flattenedScehmaMap });
          return;
        }

        const allSchemaNodes = Object.values(flattenedScehmaMap);
        const fuse = new Fuse(allSchemaNodes, fuseSchemaSearchOptions);

        const filteredNodes = fuse.search(newSearchTerm).map((result) => result.item);

        // Along with the filter results, also add in the root nodes
        const filteredFlattenedScehmaMap = filteredNodes.reduce(
          (acc, node) => {
            acc[node.key] = node;
            return acc;
          },
          {} as Record<string, SchemaNodeExtended>
        );

        for (const node of filteredNodes) {
          let currentParents = [];
          if (isLeftDirection) {
            currentParents = sourceChildParentMapping[node.key] ?? [];
          } else {
            currentParents = targetChildParentMapping[node.key] ?? [];
          }

          for (const parentKey of currentParents) {
            const parent = flattenedScehmaMap[parentKey];
            if (parent) {
              filteredFlattenedScehmaMap[parentKey] = parent;
            }
          }
        }

        setFilteredFlattenedScehmaMap(filteredFlattenedScehmaMap);
      }
    },
    [setSearchTerm, flattenedScehmaMap, setFilteredFlattenedScehmaMap, isLeftDirection, sourceChildParentMapping, targetChildParentMapping]
  );

  const onEditClick = useCallback(() => {
    if (isLeftDirection) {
      dispatch(toggleSourceEditState(true));
    } else {
      dispatch(toggleTargetEditState(true));
    }
  }, [dispatch, isLeftDirection]);

  const title = useMemo(
    () =>
      `${isLeftDirection ? stringResources.SOURCE : stringResources.DESTINATION} ${
        selectedSchemaFile?.name && !scehmaInEditState ? `(${selectedSchemaFile?.name})` : ''
      }`,
    [isLeftDirection, scehmaInEditState, selectedSchemaFile?.name, stringResources.DESTINATION, stringResources.SOURCE]
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
        text: title,
        rightAction: scehmaInEditState ? null : (
          <Button
            appearance="transparent"
            aria-label={stringResources.EDIT_SCHEMA}
            icon={<EditRegular fontSize={18} />}
            onClick={onEditClick}
          />
        ),
      }}
      search={
        scehmaInEditState
          ? undefined
          : {
              placeholder: stringResources.SEARCH_PROPERTIES,
              onChange: onSearchChange,
              text: searchTerm,
            }
      }
      styles={{
        root: mergeClasses(styles.root, scehmaInEditState ? styles.rootWithSchemaSelection : styles.rootWithSchemaTree),
        body: styles.body,
      }}
      body={
        <SchemaPanelBody
          isLeftDirection={isLeftDirection}
          schema={selectedSchema}
          setSelectedSchemaFile={setSelectedSchemaFile}
          selectedSchemaFile={selectedSchemaFile}
          errorMessage={errorMessage}
          fileSelectorOptions={fileSelectorOptions}
          setFileSelectorOptions={setFileSelectorOptions}
          showScehmaSelection={scehmaInEditState}
          flattenedSchemaMap={filteredFlattenedScehmaMap}
        />
      }
    />
  );
};
