import { useState, useCallback, useMemo } from 'react';
import { Text, Button, Spinner } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular, ArrowLeft24Regular } from '@fluentui/react-icons';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import { useAllConnectors } from '../../../../core/queries/browse';
import { useConnectorSelectionStyles } from './styles';
import { OperationSelectionGrid } from './OperationSelectionGrid';
import type { RootState } from '../../../../core/state/mcp/store';
import { useOperationsByConnectorQuery } from '../../../../core/mcp/utils/queries';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

interface OperationSelectionPanelProps {
  onDismiss: () => void;
  onBack: () => void;
  onOperationsSelect?: (operationIds: string[]) => void;
}

export const OperationSelectionPanel = ({ onDismiss, onBack, onOperationsSelect }: OperationSelectionPanelProps) => {
  const intl = useIntl();
  const styles = useConnectorSelectionStyles();

  const [selectedOperations, setSelectedOperations] = useState<Set<string>>(new Set());
  const { selectedConnectorId } = useSelector((state: RootState) => state.mcpPanel);
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

  const handleOperationToggle = useCallback((operationId: string, isSelected: boolean) => {
    setSelectedOperations((prev) => {
      const newSelection = new Set(prev);
      if (isSelected) {
        newSelection.add(operationId);
      } else {
        newSelection.delete(operationId);
      }
      return newSelection;
    });
  }, []);

  const handleSelectAll = useCallback(
    (isSelected: boolean) => {
      if (isSelected) {
        setSelectedOperations(new Set(operations.map((op) => op.id)));
      } else {
        setSelectedOperations(new Set());
      }
    },
    [operations]
  );

  const handleConfirmSelection = useCallback(() => {
    onOperationsSelect?.(Array.from(selectedOperations));
    onDismiss();
  }, [selectedOperations, onOperationsSelect, onDismiss]);

  const INTL_TEXT = {
    backToBrowse: intl.formatMessage({
      id: 'YwhRHw',
      defaultMessage: 'Back to connectors',
      description: 'Button text to return to connector browse view',
    }),
    closeAriaLabel: intl.formatMessage({
      id: 'kdCuJZ',
      defaultMessage: 'Close panel',
      description: 'Aria label for close button',
    }),
    selectOperations: intl.formatMessage({
      id: 'xFRFbz',
      defaultMessage: 'Select Operations',
      description: 'Panel title for operation selection',
    }),
    addSelected: intl.formatMessage(
      {
        id: 'C854Pk',
        defaultMessage: 'Add Selected ({count})',
        description: 'Button text to add selected operations',
      },
      { count: selectedOperations.size }
    ),
    cancel: intl.formatMessage({
      id: 'hHNj31',
      defaultMessage: 'Cancel',
      description: 'Cancel button text',
    }),
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
  };

  if (!selectedConnector) {
    return null;
  }

  if (operationsError) {
    const errorMessage = operationsError instanceof Error ? operationsError.message : 'An unknown error occurred';

    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={onBack}>
              {INTL_TEXT.backToBrowse}
            </Button>
            <Text size={600} weight="semibold" style={{ flex: 1 }}>
              {selectedConnector.properties?.displayName}
            </Text>
            <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
          </div>
        </div>
        <div className={styles.content}>
          <Text>{INTL_TEXT.errorLoadingOperations}</Text>
          <Text size={200}>{errorMessage}</Text>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoadingOperations) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerContent}>
            <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={onBack}>
              {INTL_TEXT.backToBrowse}
            </Button>
            <Text size={600} weight="semibold" style={{ flex: 1 }}>
              {selectedConnector.properties?.displayName}
            </Text>
            <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
          </div>
        </div>
        <div className={styles.content}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Spinner size="medium" label={INTL_TEXT.loadingOperations} />
          </div>
        </div>
      </div>
    );
  }

  // Main render
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.headerContent}>
          <Button appearance="subtle" icon={<ArrowLeft24Regular />} onClick={onBack}>
            {INTL_TEXT.backToBrowse}
          </Button>
          <Text size={600} weight="semibold" style={{ flex: 1 }}>
            {selectedConnector.properties?.displayName}
          </Text>
          <Button appearance="subtle" icon={<CloseIcon />} onClick={onDismiss} aria-label={INTL_TEXT.closeAriaLabel} />
        </div>
      </div>

      <div className={styles.content}>
        <OperationSelectionGrid
          operationsData={operations}
          selectedOperations={selectedOperations}
          onOperationToggle={handleOperationToggle}
          onSelectAll={handleSelectAll}
          isLoading={false} // We handle loading at the panel level
          showConnectorName={false}
          hideNoResultsText={false}
          allowSelectAll={true}
        />
      </div>

      <div className={styles.footer}>
        <Button appearance="secondary" onClick={onDismiss}>
          {INTL_TEXT.cancel}
        </Button>
        <Button appearance="primary" onClick={handleConfirmSelection} disabled={selectedOperations.size === 0}>
          {INTL_TEXT.addSelected.replace('{count}', selectedOperations.size.toString())}
        </Button>
      </div>
    </div>
  );
};
