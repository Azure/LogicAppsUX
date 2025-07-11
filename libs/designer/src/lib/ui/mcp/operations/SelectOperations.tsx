import { useCallback, useMemo } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useSelector, useDispatch } from 'react-redux';
import { useAllConnectors } from '../../../core/queries/browse';
import type { RootState, AppDispatch } from '../../../core/state/mcp/store';
import { useOperationsByConnectorQuery } from '../../../core/mcp/utils/queries';
import { setSelectedOperations } from '../../../core/state/mcp/panel/mcpPanelSlice';
import { OperationSelectionGrid } from './OperationSelectionGrid';
import { useOperationsStyles } from './styles';
import { getResourceNameFromId } from '@microsoft/logic-apps-shared';

export const SelectOperations = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useOperationsStyles();

  const { selectedConnectorId, selectedOperations } = useSelector((state: RootState) => ({
    selectedConnectorId: state.mcpPanel.selectedConnectorId,
    selectedOperations: state.mcpPanel.selectedOperations || [],
  }));

  const selectedOperationsSet = useMemo(() => new Set(selectedOperations), [selectedOperations]);

  const { data: allConnectors } = useAllConnectors();
  const {
    data: allOperations,
    isLoading: isLoadingOperations,
    error: operationsError,
  } = useOperationsByConnectorQuery(selectedConnectorId ? selectedConnectorId : '');

  const selectedConnector = useMemo(() => allConnectors?.find((c) => c.id === selectedConnectorId), [allConnectors, selectedConnectorId]);

  const operations = useMemo(() => {
    return allOperations || [];
  }, [allOperations]);

  const handleOperationToggle = useCallback(
    (operationId: string, isSelected: boolean) => {
      const newSelection = new Set(selectedOperations);
      const operationName = getResourceNameFromId(operationId);
      if (isSelected) {
        newSelection.add(operationName);
      } else {
        newSelection.delete(operationName);
      }
      dispatch(setSelectedOperations(Array.from(newSelection)));
    },
    [selectedOperations, dispatch]
  );

  const handleSelectAll = useCallback(
    (isSelected: boolean) => {
      const newSelection = isSelected ? operations.map((op) => op.name) : [];
      dispatch(setSelectedOperations(newSelection));
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
  };

  // No connector selected
  if (!selectedConnectorId || !selectedConnector) {
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
      <div className={styles.content}>
        <OperationSelectionGrid
          operationsData={operations}
          selectedOperations={selectedOperationsSet}
          onOperationToggle={handleOperationToggle}
          onSelectAll={handleSelectAll}
          isLoading={false}
          showConnectorName={false}
          hideNoResultsText={false}
          allowSelectAll={true}
        />
      </div>
    </div>
  );
};
