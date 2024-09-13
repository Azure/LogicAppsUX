import { getSelectedSchema } from '../../core';
import { setInitialSchema } from '../../core/state/DataMapSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { convertSchemaToSchemaExtended, flattenSchemaNodeMap, getFileNameAndPath } from '../../utils/Schema.Utils';
import type { DataMapSchema, SchemaNodeExtended } from '@microsoft/logic-apps-shared';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { useDispatch, useSelector } from 'react-redux';
import { usePanelStyles, useStyles } from './styles';
import { Panel } from '../../components/common/panel/Panel';
import { SchemaPanelBody } from './SchemaPanelBody';
import type { SchemaFile } from '../../models/Schema';
import { Button, mergeClasses } from '@fluentui/react-components';
import type { FileSelectorOption } from '../common/selector/FileSelector';
import Fuse from 'fuse.js';
import { EditRegular } from '@fluentui/react-icons';
import useSchema from './useSchema';

const schemaFileQuerySettings = {
  cacheTime: 0,
  retry: false, // Don't retry as it stops error from making its way through
};

const fuseSchemaSearchOptions: Fuse.IFuseOptions<SchemaNodeExtended> = {
  includeScore: true,
  minMatchCharLength: 2,
  includeMatches: true,
  threshold: 0.2,
  ignoreLocation: true,
  keys: ['name', 'qName'],
};

export interface ConfigPanelProps {
  onSubmitSchemaFileSelection: (schemaFile: SchemaFile) => void;
  id: string;
}

export const SchemaPanel = ({ id }: ConfigPanelProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const { isSourceSchema, schemaType, toggleEditState } = useSchema({ id });
  const intl = useIntl();
  const panelStyles = usePanelStyles();
  const styles = useStyles();
  const [fileSelectorOptions, setFileSelectorOptions] = useState<FileSelectorOption>('select-existing');
  const [selectedSchemaFile, setSelectedSchemaFile] = useState<SchemaFile>();
  const [errorMessage, setErrorMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentPanelView = useSelector((state: RootState) => {
    return state.panel.currentPanelView;
  });
  const { sourceInEditState, targetInEditState } = useSelector((state: RootState) => state.dataMap.present);
  const selectedSchema = useSelector((state: RootState) => {
    if (isSourceSchema) {
      return state.dataMap.present.curDataMapOperation.sourceSchema;
    }
    return state.dataMap.present.curDataMapOperation.targetSchema;
  });

  const flattenedScehmaMap = useMemo(() => (selectedSchema ? flattenSchemaNodeMap(selectedSchema.schemaTreeRoot) : {}), [selectedSchema]);

  const [filteredFlattenedScehmaMap, setFilteredFlattenedScehmaMap] = useState(flattenedScehmaMap);

  const scehmaInEditState = useMemo(
    () => (isSourceSchema ? sourceInEditState : targetInEditState),
    [isSourceSchema, sourceInEditState, targetInEditState]
  );

  const fetchSchema: UseQueryResult<DataMapSchema, { message: string }> = useQuery(
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

  const { isSuccess, data, error } = fetchSchema;

  useEffect(() => {
    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage('');
    }
  }, [error]);

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
          const currentParents = node.pathToRoot;

          for (const parent of currentParents) {
            const key = parent.key;
            if (key !== node.key) {
              const parentNode = flattenedScehmaMap[key];
              if (parentNode) {
                filteredFlattenedScehmaMap[key] = parentNode;
              }
            }
          }
        }

        setFilteredFlattenedScehmaMap(filteredFlattenedScehmaMap);
      }
    },
    [setSearchTerm, flattenedScehmaMap, setFilteredFlattenedScehmaMap]
  );

  const onEditClick = useCallback(() => {
    toggleEditState(true);
  }, [toggleEditState]);

  const setSelectedFileSchemaAndResetState = useCallback((item?: SchemaFile) => {
    setSelectedSchemaFile(item);
    setErrorMessage(''); //reset the error message
  }, []);

  // if initial flat-map changes, filtered version needs to be reset
  useEffect(() => {
    setFilteredFlattenedScehmaMap(flattenedScehmaMap);
  }, [setFilteredFlattenedScehmaMap, flattenedScehmaMap]);

  return (
    <div className={mergeClasses(styles.root, isSourceSchema ? '' : styles.targetScehmaRoot)}>
      <Panel
        id={`panel_${schemaType}`}
        isOpen={!!currentPanelView}
        title={{
          text: isSourceSchema ? stringResources.SOURCE : stringResources.DESTINATION,
          subTitleText: selectedSchemaFile?.name,
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
          root: mergeClasses(panelStyles.root, 'nodrag nopan', scehmaInEditState ? panelStyles.schemaSelection : panelStyles.schemaTree),
          body: mergeClasses(panelStyles.body, isSourceSchema ? '' : panelStyles.targetSchemaBody),
        }}
        body={
          <SchemaPanelBody
            id={id}
            schema={selectedSchema}
            setSelectedSchemaFile={setSelectedFileSchemaAndResetState}
            selectedSchemaFile={selectedSchemaFile}
            errorMessage={errorMessage}
            fileSelectorOptions={fileSelectorOptions}
            setFileSelectorOptions={setFileSelectorOptions}
            showScehmaSelection={scehmaInEditState}
            flattenedSchemaMap={filteredFlattenedScehmaMap}
          />
        }
      />
    </div>
  );
};
