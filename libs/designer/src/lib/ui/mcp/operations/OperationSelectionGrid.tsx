import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { Text, Checkbox, Card, CardHeader, Body1, Caption1 } from '@fluentui/react-components';
import { useOperationSelectionGridStyles } from './styles';
import { equals, type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';
import { selectOperations } from '../../../core/state/mcp/mcpselectionslice';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../../../core/state/mcp/store';

export interface OperationSelectionGridProps {
  isLoading: boolean;
  operationsData: DiscoveryOpArray;
  onSelectAll?: (isSelected: boolean) => void;
  showConnectorName?: boolean;
  hideNoResultsText?: boolean;
  allowSelectAll?: boolean;
}

interface OperationCellProps {
  operation: DiscoveryOpArray[number];
  isSelected: boolean;
  showConnectorName: boolean;
  onCardClick: (operationId: string, event: React.MouseEvent) => void;
  onCheckboxChange: (operationId: string, checked: boolean) => void;
  styles: ReturnType<typeof useOperationSelectionGridStyles>;
}

const OperationCell = ({ operation, isSelected, showConnectorName, onCardClick, onCheckboxChange, styles }: OperationCellProps) => {
  const { properties, name } = operation;
  const { api, summary, description, annotation } = properties;

  return (
    <Card
      className={isSelected ? styles.operationCardSelected : styles.operationCard}
      appearance="subtle"
      onClick={(event) => onCardClick(name, event)}
    >
      <CardHeader
        image={<img src={api?.iconUri ?? DefaultIcon} alt={api?.displayName} className={styles.connectorIcon} />}
        header={
          <div className={styles.operationHeader}>
            <Body1 className={styles.operationTitle} title={summary}>
              {summary}
            </Body1>
            <Checkbox
              checked={isSelected}
              onChange={(_, data) => onCheckboxChange(name, data.checked === true)}
              aria-label={`Select ${summary}`}
              className={styles.checkboxInCard}
            />
          </div>
        }
        description={
          <div className={styles.operationMeta}>
            <Caption1 className={styles.operationDescription} title={description}>
              {description}
            </Caption1>
            {showConnectorName && <Caption1 className={styles.connectorName}>{api.displayName}</Caption1>}
            {annotation?.status && !equals(annotation?.status, 'production') && (
              <Caption1 className={styles.operationStatus}>{annotation.status}</Caption1>
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
  onSelectAll,
  isLoading,
  showConnectorName = false,
  hideNoResultsText = false,
  allowSelectAll = true,
}: OperationSelectionGridProps) => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const styles = useOperationSelectionGridStyles();
  const [columnsCount, setColumnsCount] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const { selectedOperations } = useSelector((state: RootState) => ({
    selectedOperations: state.mcpSelection.selectedOperations ?? [],
  }));
  const selectedOperationsSet = useMemo(() => new Set(selectedOperations), [selectedOperations]);
  useEffect(() => {
    const element = containerRef.current;
    if (!element) {
      return;
    }

    const updateLayout = () => {
      setColumnsCount(getColumnsCount(element.clientWidth));
    };

    updateLayout();

    const observer = new ResizeObserver(() => {
      updateLayout();
    });

    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  const toggleOperation = useCallback(
    (operationName: string, isSelected: boolean) => {
      const newSelection = new Set(selectedOperations);
      if (isSelected) {
        newSelection.add(operationName);
      } else {
        newSelection.delete(operationName);
      }
      dispatch(selectOperations(Array.from(newSelection)));
    },
    [selectedOperations, dispatch]
  );

  const handleCardClick = useCallback(
    (operationName: string, event: React.MouseEvent) => {
      if ((event.target as HTMLElement).closest('[role="checkbox"]')) {
        return;
      }

      const isCurrentlySelected = selectedOperationsSet.has(operationName);
      toggleOperation(operationName, !isCurrentlySelected);
    },
    [selectedOperationsSet, toggleOperation]
  );

  const handleCheckboxChange = useCallback(
    (operationId: string, checked: boolean) => {
      toggleOperation(operationId, checked);
    },
    [toggleOperation]
  );
  const selectableOperations = operationsData;
  const allSelected = selectableOperations.length > 0 && selectableOperations.every((item) => selectedOperationsSet.has(item.name));
  const someSelected = selectableOperations.some((item) => selectedOperationsSet.has(item.name));

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

  const noOperationsText = intl.formatMessage({
    defaultMessage: 'This connector may not have any operations available, or they may not be loaded yet',
    id: 'TaoHbb',
    description: 'Text to show when there are no operations available for the selected connector',
  });
  const selectionCountText = intl.formatMessage(
    {
      defaultMessage: '{selectedCount} of {totalCount} selected',
      id: 'qwZaWJ',
      description: 'Text showing how many operations are selected out of total available',
    },
    {
      selectedCount: selectedOperationsSet.size,
      totalCount: selectableOperations.length,
    }
  );

  if (!isLoading && operationsData.length === 0 && !hideNoResultsText) {
    return (
      <div className={styles.noResultsContainer}>
        <Text size={500}>{noResultsText}</Text>
        <Text size={300} className={styles.noResultsSubtext}>
          {noOperationsText}
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
            {selectionCountText}
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
            isSelected={selectedOperationsSet.has(operation.name)}
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
