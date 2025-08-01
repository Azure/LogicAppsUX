import { useCallback, useMemo, useState } from 'react';
import { Text, Spinner, SearchBox } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import Fuse from 'fuse.js';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useOperationsByConnectorQuery } from '../../../core/mcp/utils/queries';
import { OperationSelectionGrid } from './OperationSelectionGrid';
import { selectOperations } from '../../../core/state/mcp/mcpselectionslice';
import { useConnectorSelectionStyles } from '../connectors/styles';
import { isUndefinedOrEmptyString } from '@microsoft/logic-apps-shared';
import { ErrorBar } from '../../configuretemplate/common';

const fuseOptions = {
  includeScore: true,
  threshold: 1.0, // Include all items, even very poor matches
  ignoreLocation: true,
  keys: [
    { name: 'name', weight: 2.0 },
    { name: 'properties.summary', weight: 2.0 },
    { name: 'properties.description', weight: 1 },
  ],
};

export const SelectOperations = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useConnectorSelectionStyles();

  const { selectedConnectorId, errorMessage } = useSelector((state: RootState) => ({
    selectedConnectorId: state.mcpSelection.selectedConnectorId,
    errorMessage: state.mcpSelection.errors.operations,
  }));
  const [searchTerm, setSearchTerm] = useState('');

  const {
    data: allOperations,
    isLoading: isLoadingOperations,
    error: operationsError,
  } = useOperationsByConnectorQuery(selectedConnectorId ? selectedConnectorId : '');

  const operations = useMemo(() => {
    const allOps = allOperations || [];

    const trimmedSearchTerm = searchTerm.trim();

    // If no search keyword, return all operations sorted alphabetically
    if (isUndefinedOrEmptyString(trimmedSearchTerm)) {
      return [...allOps].sort((a, b) => (a.properties.summary || '').localeCompare(b.properties.summary || ''));
    }

    const fuse = new Fuse(allOps, fuseOptions);
    const searchResults = fuse.search(trimmedSearchTerm, { limit: allOps.length });

    return searchResults.map((result) => result.item);
  }, [allOperations, searchTerm]);

  const handleSelectAll = useCallback(
    (isSelected: boolean) => {
      const newSelection = isSelected ? operations.map((op) => op.name) : [];
      dispatch(selectOperations(newSelection));
    },
    [operations, dispatch]
  );

  const INTL_TEXT = {
    loadingOperations: intl.formatMessage({
      id: 'VFaFVs',
      defaultMessage: 'Loading operations...',
      description: 'Loading message for operations',
    }),
    errorLoadingOperations: intl.formatMessage({
      id: 'gUF6uV',
      defaultMessage: 'Error loading operations',
      description: 'Error message when operations fail to load',
    }),
    noConnectorSelected: intl.formatMessage({
      id: 'P2JpFk',
      defaultMessage: 'Please select a connector first',
      description: 'Message when no connector is selected',
    }),
    searchPlaceholder: intl.formatMessage({
      id: 'IRVmBd',
      defaultMessage: 'Search operations...',
      description: 'Placeholder text for operation search box',
    }),
    operationsErrorTitle: intl.formatMessage({
      id: '+7+u4y',
      defaultMessage: 'Failed to initialize the following operations. Please try again later.',
      description: 'Title for operations error message',
    }),
  };

  // No connector selected
  if (!selectedConnectorId) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Text>{INTL_TEXT.noConnectorSelected}</Text>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (operationsError) {
    const errorMessage = operationsError instanceof Error ? operationsError.message : 'An unknown error occurred';

    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: '8px',
            }}
          >
            <Text>{INTL_TEXT.errorLoadingOperations}</Text>
            <Text size={200}>{errorMessage}</Text>
          </div>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingOperations) {
    return (
      <div className={styles.container}>
        <div className={styles.content}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
            }}
          >
            <Spinner size="medium" label={INTL_TEXT.loadingOperations} />
          </div>
        </div>
      </div>
    );
  }

  // Main content
  return (
    <div className={styles.container}>
      {errorMessage ? (
        <ErrorBar
          title={INTL_TEXT.operationsErrorTitle}
          messageInNewline={true}
          errorMessage={errorMessage}
          styles={{ margin: '0 16px' }}
        />
      ) : null}
      <div className={styles.searchSection}>
        <SearchBox
          className={styles.searchBox}
          placeholder={INTL_TEXT.searchPlaceholder}
          onChange={(_, data) => {
            setSearchTerm(data.value);
          }}
        />
      </div>
      <div className={styles.content}>
        <OperationSelectionGrid
          operationsData={operations}
          onSelectAll={handleSelectAll}
          isLoading={isLoadingOperations}
          showConnectorName={false}
          hideNoResultsText={false}
          allowSelectAll={true}
        />
      </div>
    </div>
  );
};
