import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import {
  initializeVariableOperation,
  parsedocumentwithmetadata,
  type Connector,
  type DiscoveryOpArray,
} from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDiscoveryPanelRelationshipIds } from '../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { useDispatch } from 'react-redux';
import { addConnectorAsOperation, type AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useShouldEnableParseDocumentWithMetadata } from './hooks';

type OperationGroupDetailViewProps = {
  connector?: Connector;
  groupOperations: DiscoveryOpArray;
  filters: Record<string, string>;
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  ignoreActionsFilter: boolean;
};

export const OperationGroupDetailView = (props: OperationGroupDetailViewProps) => {
  const { connector, groupOperations, filters, onOperationClick, isLoading, ignoreActionsFilter } = props;
  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const graphId = useMemo(() => relationshipIds.graphId, [relationshipIds]);
  const isRoot = useMemo(() => graphId === 'root', [graphId]);
  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);
  const shouldEnableParseDocWithMetadata = useShouldEnableParseDocumentWithMetadata();

  const dispatch = useDispatch<AppDispatch>();

  const filterItems = useCallback(
    (data: OperationActionData): boolean => {
      if (!isRoot && data.apiId === 'connectionProviders/variable' && data.id === initializeVariableOperation.id) {
        return false; // Filter out initialize variables when in a scope
      }

      if (shouldEnableParseDocWithMetadata === false && data.id === parsedocumentwithmetadata.id) {
        return false;
      }

      return (
        !filters?.['actionType'] || // if I don't have a filter
        (filters?.['actionType'] === 'actions' && !data.isTrigger) || // or that the filter is actions, and the operation is not a trigger
        (filters?.['actionType'] === 'triggers' && data.isTrigger) || // or that the filter is triggers, and the operation is a trigger
        (filters?.['actionType'] === 'actions' && ignoreActionsFilter) // or that the filter is action, and that I should ignore the actions filter
      );
    },
    [filters, ignoreActionsFilter, isRoot, shouldEnableParseDocWithMetadata]
  );
  const operationGroupActions: OperationActionData[] = groupOperations
    .map((operation) => OperationActionDataFromOperation(operation))
    .filter(filterItems);

  const addOperationAsConnector = useCallback(
    (connector?: Connector, actionData?: OperationActionData[]) => {
      dispatch(selectOperationGroupId(''));
      dispatch(addConnectorAsOperation({ relationshipIds, connector, actionData }));
    },
    [dispatch, relationshipIds]
  );

  return (
    <OperationGroupDetailsPage
      connector={connector}
      operationActionsData={operationGroupActions}
      onOperationClick={onOperationClick}
      isLoading={isLoading}
      addAsConnector={isWithinAgenticLoop ? addOperationAsConnector : undefined}
    />
  );
};
