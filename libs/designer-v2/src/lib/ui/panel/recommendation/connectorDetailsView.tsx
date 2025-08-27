import { useMemo } from 'react';
import { Text } from '@fluentui/react-components';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation } from '@microsoft/designer-ui';
import { isNullOrUndefined, type Connector, type DiscoveryOpArray } from '@microsoft/logic-apps-shared';
import { useDiscoveryPanelIsAddingTrigger, useIsAddingAgentTool } from '../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../core/state/workflow/workflowSelectors';
import { useShouldEnableNestedAgent, useShouldEnableParseDocumentWithMetadata } from './hooks';
import constants from '../../../common/constants';
import { useConnectorDetailsViewStyles } from './styles/ConnectorDetailsView.styles';
import { OperationsAccordion } from './operationsAccordion';

type ConnectorDetailsViewProps = {
  connector?: Connector;
  groupOperations: DiscoveryOpArray;
  onTriggerClick: (id: string, apiId?: string) => void;
  onActionClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  ignoreActionsFilter: boolean;
};

export const ConnectorDetailsView = ({
  connector,
  groupOperations,
  onTriggerClick,
  onActionClick,
  isLoading,
}: ConnectorDetailsViewProps) => {
  const classes = useConnectorDetailsViewStyles();
  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const isAgentTool = useIsAddingAgentTool();
  const shouldEnableParseDocWithMetadata = useShouldEnableParseDocumentWithMetadata();
  const shouldEnableNestedAgent = useShouldEnableNestedAgent();

  // Get graph context for filtering
  const graphId = 'root'; // Simplified since we only need basic filtering
  const isRoot = graphId === 'root';
  const isWithinAgenticLoop = useIsWithinAgenticLoop(graphId);

  const filterItems = useMemo(
    () =>
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

        if (shouldEnableParseDocWithMetadata === false && data.id === 'parsedocumentwithmetadata') {
          return false;
        }

        return true;
      },
    [isAgentTool, isRoot, isWithinAgenticLoop, shouldEnableNestedAgent, shouldEnableParseDocWithMetadata]
  );

  const allOperations: OperationActionData[] = useMemo(() => {
    return groupOperations
      .map((operation) => OperationActionDataFromOperation(operation))
      .filter(filterItems)
      .sort((a, b) => {
        // Sort alphabetically by title
        const aTitle = a.title || '';
        const bTitle = b.title || '';
        return aTitle.localeCompare(bTitle);
      });
  }, [groupOperations, filterItems]);

  const triggers = useMemo(() => allOperations.filter((op) => op.isTrigger), [allOperations]);
  const actions = useMemo(() => allOperations.filter((op) => !op.isTrigger), [allOperations]);

  const connectorName = connector?.properties?.displayName || 'Connector';
  const connectorDescription = connector?.properties?.description;
  const connectorIcon = connector?.properties?.iconUri;
  const brandColor = connector?.properties?.brandColor || '#0078d4';

  if (isNullOrUndefined(connector) && isLoading) {
    return null;
  }

  return (
    <div className={classes.container}>
      {/* Connector Header Info */}
      <div className={classes.header}>
        {connectorIcon && <img src={connectorIcon} alt={connectorName} className={classes.connectorIcon} />}
        <div className={classes.headerContent}>
          <Text weight="semibold" size={400} className={classes.connectorName} style={{ color: brandColor }}>
            {connectorName}
          </Text>
          {connectorDescription && (
            <Text size={300} className={classes.connectorDescription}>
              {connectorDescription}
            </Text>
          )}
        </div>
      </div>

      {/* Operations Content */}
      <OperationsAccordion
        triggers={triggers}
        actions={actions}
        isTrigger={isTrigger}
        isLoading={isLoading}
        onTriggerClick={onTriggerClick}
        onActionClick={onActionClick}
      />
    </div>
  );
};
