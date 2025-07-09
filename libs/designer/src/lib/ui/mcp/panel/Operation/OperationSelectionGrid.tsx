import { useCallback, useEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Text, Checkbox, Card, CardHeader, Body1, Caption1 } from '@fluentui/react-components';
import { useOperationSelectionGridStyles } from './styles';
import type { DiscoveryOpArray } from '@microsoft/logic-apps-shared';

export interface OperationSelectionGridProps {
  operationsData: DiscoveryOpArray;
  selectedOperations: Set<string>;
  onOperationToggle: (operationId: string, isSelected: boolean) => void;
  onSelectAll?: (isSelected: boolean) => void;
  isLoading: boolean;
  showConnectorName?: boolean;
  hideNoResultsText?: boolean;
  allowSelectAll?: boolean;
}

// Separate cell component with consistent dimensions
interface OperationCellProps {
  operation: DiscoveryOpArray[number];
  isSelected: boolean;
  showConnectorName: boolean;
  onCardClick: (operationId: string, event: React.MouseEvent) => void;
  onCheckboxChange: (operationId: string, checked: boolean) => void;
  styles: ReturnType<typeof useOperationSelectionGridStyles>;
}

const OperationCell = ({ operation, isSelected, showConnectorName, onCardClick, onCheckboxChange, styles }: OperationCellProps) => {
  return (
    <Card
      className={isSelected ? styles.operationCardSelected : styles.operationCard}
      appearance="subtle"
      onClick={(event) => onCardClick(operation.id, event)}
    >
      <CardHeader
        image={
          operation.properties.api.iconUri ? (
            <img src={operation.properties.api.iconUri} alt={operation.properties.api.displayName} className={styles.connectorIcon} />
          ) : (
            <div
              className={styles.connectorIconPlaceholder}
              style={{ backgroundColor: operation.properties.api.brandColor || '#0078d4' }}
            />
          )
        }
        header={
          <div className={styles.operationHeader}>
            <Body1 className={styles.operationTitle} title={operation.properties.summary}>
              {operation.properties.summary}
            </Body1>
            <Checkbox
              checked={isSelected}
              onChange={(_, data) => onCheckboxChange(operation.id, data.checked === true)}
              aria-label={`Select ${operation.properties.summary}`}
              className={styles.checkboxInCard}
            />
          </div>
        }
        description={
          <div className={styles.operationMeta}>
            <Caption1 className={styles.operationDescription} title={operation.properties.description}>
              {operation.properties.description}
            </Caption1>
            {showConnectorName && <Caption1 className={styles.connectorName}>{operation.properties.api.displayName}</Caption1>}
            {operation.properties.annotation?.status && (
              <Caption1 className={styles.operationStatus}>{operation.properties.annotation.status}</Caption1>
            )}
          </div>
        }
      />
    </Card>
  );
};

const getColumnsCount = (containerWidth: number): number => {
  if (containerWidth < 600) {
    return 1;
  }
  return 2;
};

export const OperationSelectionGrid = ({
  operationsData,
  selectedOperations,
  onOperationToggle,
  onSelectAll,
  isLoading,
  showConnectorName = false,
  hideNoResultsText = false,
  allowSelectAll = true,
}: OperationSelectionGridProps) => {
  const intl = useIntl();
  const styles = useOperationSelectionGridStyles();
  const [columnsCount, setColumnsCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateLayout = () => {
      setColumnsCount(getColumnsCount(element.clientWidth));
    };

    updateLayout(); // Initial layout

    const observer = new ResizeObserver(() => {
      updateLayout();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const handleCardClick = useCallback(
    (operationId: string, event: React.MouseEvent) => {
      // Prevent toggling if the checkbox itself was clicked
      if ((event.target as HTMLElement).closest('[role="checkbox"]')) {
        return;
      }

      const isCurrentlySelected = selectedOperations.has(operationId);
      onOperationToggle(operationId, !isCurrentlySelected);
    },
    [selectedOperations, onOperationToggle]
  );

  const handleCheckboxChange = useCallback(
    (operationId: string, checked: boolean) => {
      onOperationToggle(operationId, checked);
    },
    [onOperationToggle]
  );

  const noResultsText = intl.formatMessage({
    defaultMessage: 'No operations found',
    id: 'bkuRuS',
    description: 'Text to show when there are no operations with the given filters',
  });

  const selectAllText = intl.formatMessage({
    defaultMessage: 'Select all operations',
    id: 'LxB+6u',
    description: 'Label for select all checkbox',
  });

  // Calculate select all state
  const selectableOperations = operationsData;
  const allSelected = selectableOperations.length > 0 && selectableOperations.every((item) => selectedOperations.has(item.id));
  const someSelected = selectableOperations.some((item) => selectedOperations.has(item.id));

  if (!isLoading && operationsData.length === 0 && !hideNoResultsText) {
    return (
      <div className={styles.noResultsContainer}>
        <Text size={500}>{noResultsText}</Text>
        <Text size={300} className={styles.noResultsSubtext}>
          This connector may not have any operations available, or they may not be loaded yet.
        </Text>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={styles.container}>
      {allowSelectAll && selectableOperations.length > 0 && (
        <div className={styles.selectionHeader}>
          <Checkbox
            checked={allSelected ? true : someSelected ? 'mixed' : false}
            onChange={(_, data) => onSelectAll?.(data.checked === true)}
            label={selectAllText}
          />
          <Text size={200} className={styles.selectionCount}>
            {selectedOperations.size} of {selectableOperations.length} selected
          </Text>
        </div>
      )}

      <div
        className={styles.operationsGrid}
        style={{
          gridTemplateColumns: `repeat(${columnsCount}, 1fr)`,
        }}
      >
        {operationsData.map((operation) => (
          <OperationCell
            key={operation.id}
            operation={operation}
            isSelected={selectedOperations.has(operation.id)}
            showConnectorName={showConnectorName}
            onCardClick={handleCardClick}
            onCheckboxChange={handleCheckboxChange}
            styles={styles}
          />
        ))}
      </div>
    </div>
  );
};
