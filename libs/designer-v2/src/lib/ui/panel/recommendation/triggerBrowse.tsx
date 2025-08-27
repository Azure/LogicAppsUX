import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addOperation } from '../../../core/actions/bjsworkflow/add';
import {
  useDiscoveryPanelRelationshipIds,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelSelectedBrowseCategory,
} from '../../../core/state/panel/panelSelectors';
import { CategoryCard } from './categoryCard';
import { ConnectorBrowse } from './connectorBrowse';
import { TriggerOperationList } from './triggerOperationList';
import { useActionBrowseStyles } from './styles/ActionBrowse.styles';
import { getTriggerCategories } from '@microsoft/designer-ui';
import type { AppDispatch } from '../../../core';
import type { DiscoveryOperation } from '@microsoft/logic-apps-shared';
import { selectBrowseCategory } from '../../../core/state/panel/panelSlice';
import { getNodeId } from './helpers';

export interface TriggerBrowseProps {
  onConnectorSelected?: (connectorId: string, origin?: string) => void;
  onOperationSelected?: (operationId: string, apiId?: string) => void;
}

export const TriggerBrowse = (props: TriggerBrowseProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const classes = useActionBrowseStyles();
  const selectedBrowseCategory = useDiscoveryPanelSelectedBrowseCategory();

  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const isParallelBranch = useDiscoveryPanelIsParallelBranch();

  const categories = getTriggerCategories();

  const addTriggerOperation = useCallback(
    (operation: DiscoveryOperation<any>) => {
      const nodeId = getNodeId(operation);
      dispatch(
        addOperation({
          operation,
          relationshipIds,
          nodeId,
          isParallelBranch,
          isTrigger: true,
        })
      );
    },
    [dispatch, relationshipIds, isParallelBranch]
  );

  const onCategoryClick = useCallback(
    (categoryKey: string) => {
      const category = categories.find((cat) => cat.key === categoryKey);
      if (category?.type === 'immediate' && category.operations?.length === 1) {
        // Immediately add the operation if it's an immediate trigger with one operation
        addTriggerOperation(category.operations[0]);
        return;
      }
      // Update Redux state for category selection
      dispatch(selectBrowseCategory({ key: categoryKey, title: category?.text || categoryKey }));
    },
    [categories, addTriggerOperation, dispatch]
  );

  // Show appropriate view when a category is selected
  if (selectedBrowseCategory) {
    const category = categories.find((cat) => cat.key === selectedBrowseCategory.key);

    if (category?.type === 'connector_browse') {
      // Use ConnectorBrowse for all connector browse categories
      return (
        <ConnectorBrowse
          categoryKey={selectedBrowseCategory.key}
          onConnectorSelected={props.onConnectorSelected}
          connectorFilters={category.connectorFilters}
          filters={{ actionType: 'triggers' }}
          displayRuntimeInfo={true}
          hideFilters={false}
        />
      );
    }

    if (category?.type === 'operation_list' && category.operations) {
      return <TriggerOperationList operations={category.operations} onOperationSelected={addTriggerOperation} />;
    }
  }

  // Show category cards when no category is selected
  return (
    <div className={classes.container}>
      {categories.map((category) => (
        <CategoryCard
          key={category.key}
          categoryKey={category.key}
          categoryTitle={category.text}
          categoryDescription={category.description}
          icon={category.icon}
          isCategory={category.type !== 'immediate'}
          onCategoryClick={onCategoryClick}
        />
      ))}
    </div>
  );
};
