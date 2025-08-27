import { useCallback } from 'react';
import { useIntl } from 'react-intl';
import { Text } from '@fluentui/react-components';
import { CategoryCard } from './categoryCard';
import { useActionBrowseStyles } from './styles/ActionBrowse.styles';
import { useTriggerOperationListStyles } from './styles/TriggerOperationList.styles';
import type { DiscoveryOperation } from '@microsoft/logic-apps-shared';

export interface TriggerOperationListProps {
  operations: DiscoveryOperation<any>[];
  onOperationSelected: (operation: DiscoveryOperation<any>) => void;
}

export const TriggerOperationList = ({ operations, onOperationSelected }: TriggerOperationListProps) => {
  const intl = useIntl();
  const classes = useActionBrowseStyles();
  const operationClasses = useTriggerOperationListStyles();

  const handleOperationClick = useCallback(
    (operationKey: string) => {
      const operation = operations.find((op) => op.id === operationKey);
      if (operation) {
        onOperationSelected(operation);
      }
    },
    [operations, onOperationSelected]
  );

  const getOperationIcon = useCallback((operation: DiscoveryOperation<any>) => {
    if (operation.properties?.iconUri) {
      return (
        <img
          src={operation.properties.iconUri}
          alt={operation.properties.summary || operation.name}
          className={operationClasses.operationIcon}
        />
      );
    }
    return null;
  }, []);

  return (
    <div className={classes.container}>
      {operations.length === 0 ? (
        <Text className={operationClasses.noOperationsText}>
          {intl.formatMessage({
            defaultMessage: 'No operations found for this category',
            id: 'W4TFz4',
            description: 'No operations message',
          })}
        </Text>
      ) : (
        operations.map((operation) => (
          <CategoryCard
            key={operation.id}
            categoryKey={operation.id}
            categoryTitle={operation.properties?.summary || operation.name}
            categoryDescription={operation.properties?.description}
            icon={getOperationIcon(operation)}
            isCategory={false} // No chevron for operations
            onCategoryClick={handleOperationClick}
          />
        ))
      )}
    </div>
  );
};
