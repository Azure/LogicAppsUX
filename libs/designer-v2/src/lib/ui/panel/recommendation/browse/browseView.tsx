import { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { addOperation } from '../../../../core/actions/bjsworkflow/add';
import {
  useDiscoveryPanelRelationshipIds,
  useDiscoveryPanelIsParallelBranch,
  useDiscoveryPanelSelectedBrowseCategory,
} from '../../../../core/state/panel/panelSelectors';
import { selectOperationGroupId, selectBrowseCategory } from '../../../../core/state/panel/panelSlice';
import { CategoryCard } from './categoryCard';
import { ConnectorBrowse } from './connectorBrowse';
import { useBrowseViewStyles } from './styles/BrowseView.styles';
import { Favorites } from '../categories/Favorites';
import type { AppDispatch } from '../../../../core';
import type { DiscoveryOperation, DiscoveryResultTypes } from '@microsoft/logic-apps-shared';
import { getNodeId } from '../helpers';
import { getTriggerCategories, getActionCategories, BrowseCategoryType } from './helper';

interface BrowseViewProps {
  isTrigger?: boolean;
}

export const BrowseView = ({ isTrigger = false }: BrowseViewProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const classes = useBrowseViewStyles();
  const selectedBrowseCategory = useDiscoveryPanelSelectedBrowseCategory();

  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const isParallelBranch = useDiscoveryPanelIsParallelBranch();

  const categories = isTrigger ? getTriggerCategories() : getActionCategories();

  const addTriggerOperation = useCallback(
    (operation: DiscoveryOperation<DiscoveryResultTypes>) => {
      const nodeId = getNodeId(operation);
      dispatch(
        addOperation({
          operation,
          relationshipIds,
          nodeId,
          isParallelBranch,
          isTrigger,
        })
      );
    },
    [dispatch, relationshipIds, isParallelBranch, isTrigger]
  );

  const onConnectorSelected = useCallback(
    (connectorId: string) => {
      dispatch(selectOperationGroupId(connectorId));
    },
    [dispatch]
  );

  const onOperationSelected = useCallback((operationId: string, apiId?: string) => {
    // This should trigger adding the operation - we'll need to implement this
    // For now, just log it
    console.log('Operation selected:', operationId, apiId);
  }, []);

  const onCategoryClick = useCallback(
    (categoryKey: string) => {
      const category = categories.find((cat) => cat.key === categoryKey);
      if (category?.type === BrowseCategoryType.IMMEDIATE && category.operation) {
        // Immediately add the operation if it's an immediate trigger with one operation
        addTriggerOperation(category.operation);
        return;
      }
      // Update Redux state for category selection
      dispatch(selectBrowseCategory({ key: categoryKey, title: category?.text ?? categoryKey }));
    },
    [categories, addTriggerOperation, dispatch]
  );

  // Show appropriate view when a category is selected
  if (selectedBrowseCategory) {
    const category = categories.find((cat) => cat.key === selectedBrowseCategory.key);

    if (category?.type === BrowseCategoryType.BROWSE) {
      // Special case for favorites category
      if (selectedBrowseCategory.key === 'favorites') {
        return <Favorites onConnectorSelected={onConnectorSelected} onOperationSelected={onOperationSelected} />;
      }

      return (
        <ConnectorBrowse
          categoryKey={selectedBrowseCategory.key}
          connectorFilters={category.connectorFilters}
          filters={{ actionType: isTrigger ? 'trigger' : 'action' }}
          displayRuntimeInfo={true}
          onConnectorSelected={onConnectorSelected}
        />
      );
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
