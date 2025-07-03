import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, OperationGroupDetailsPage } from '@microsoft/designer-ui';
import { parsedocumentwithmetadata, type Connector, type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { useCallback, useMemo } from 'react';
import { useDiscoveryPanelRelationshipIds, useIsAddingAgentTool } from '../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { useDispatch } from 'react-redux';
import { addConnectorAsOperation, type AppDispatch } from '../../../core';
import { selectOperationGroupId } from '../../../core/state/panel/panelSlice';
import { useShouldEnableNestedAgent, useShouldEnableParseDocumentWithMetadata } from './hooks';
import constants from '../../../common/constants';

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
  const isAgentTool = useIsAddingAgentTool();
  const shouldEnableParseDocWithMetadata = useShouldEnableParseDocumentWithMetadata();
  const shouldEnableNestedAgent = useShouldEnableNestedAgent();

  const dispatch = useDispatch<AppDispatch>();

  const filterItems = useCallback(
    (data: OperationActionData): boolean => {
      if (!isRoot && data.apiId === 'connectionProviders/variable' && data.id === constants.NODE.TYPE.INITIALIZE_VARIABLE) {
        return false; // Filter out initialize variables when in a scope
      }

      if (
        (isWithinAgenticLoop || isAgentTool) && // can't filter on all control because of terminate
        (data.id === constants.NODE.TYPE.SWITCH ||
          data.id === constants.NODE.TYPE.SCOPE ||
          data.id === constants.NODE.TYPE.IF ||
          data.id === constants.NODE.TYPE.UNTIL ||
          data.id === constants.NODE.TYPE.FOREACH)
      ) {
        return false;
      }

      if (data.id === 'invokeNestedAgent') {
        if (!shouldEnableNestedAgent || !(isWithinAgenticLoop || isAgentTool)) {
          return false;
        }
      }

      if (shouldEnableParseDocWithMetadata === false && data.id === parsedocumentwithmetadata.id) {
        return false;
      }

      return (
        !filters?.['actionType'] ||
        (filters?.['actionType'] === 'actions' && (!data.isTrigger || ignoreActionsFilter)) ||
        (filters?.['actionType'] === 'triggers' && data.isTrigger)
      );
    },
    [filters, ignoreActionsFilter, isAgentTool, isRoot, isWithinAgenticLoop, shouldEnableNestedAgent, shouldEnableParseDocWithMetadata]
  );
  const operationGroupActions: OperationActionData[] = groupOperations
    .map((operation) => OperationActionDataFromOperation(operation))
    .filter(filterItems)
    .sort((a, b) => {
      // Sort alphabetically by title
      const aTitle = a.title || '';
      const bTitle = b.title || '';
      return aTitle.localeCompare(bTitle);
    });

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
