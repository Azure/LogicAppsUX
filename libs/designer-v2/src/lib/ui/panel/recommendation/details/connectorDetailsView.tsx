import { useMemo } from 'react';
import { Text, Spinner } from '@fluentui/react-components';
import type { OperationActionData } from '@microsoft/designer-ui';
import { OperationActionDataFromOperation, FavoriteButton } from '@microsoft/designer-ui';
import { isNullOrUndefined, type Connector } from '@microsoft/logic-apps-shared';
import { useDiscoveryPanelIsAddingTrigger, useIsAddingAgentTool } from '../../../../core/state/panel/panelSelectors';
import { useIsWithinAgenticLoop } from '../../../../core/state/workflow/workflowSelectors';
import { useOperationsByConnector } from '../../../../core/queries/browse';
import constants from '../../../../common/constants';
import { useConnectorDetailsViewStyles } from './styles/ConnectorDetailsView.styles';
import { OperationsAccordion } from './operationsAccordion';

type ConnectorDetailsViewProps = {
  connector?: Connector;
  onOperationClick: (id: string, apiId?: string, forceAsTrigger?: boolean) => void;
};

export const ConnectorDetailsView = ({ connector, onOperationClick }: ConnectorDetailsViewProps) => {
  const classes = useConnectorDetailsViewStyles();
  const isTrigger = useDiscoveryPanelIsAddingTrigger();
  const isAgentTool = useIsAddingAgentTool();

  // Fetch operations for this connector
  const connectorId = connector?.id || '';
  const { data: groupOperations, isLoading } = useOperationsByConnector(connectorId);

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
          if (!(isWithinAgenticLoop || isAgentTool)) {
            return false;
          }
        }

        return true;
      },
    [isAgentTool, isRoot, isWithinAgenticLoop]
  );

  const allOperations: OperationActionData[] = useMemo(() => {
    if (!groupOperations) {
      return [];
    }

    return groupOperations
      .map((operation) => OperationActionDataFromOperation(operation))
      .filter(filterItems)
      .sort((a, b) => {
        const aTitle = a.title ?? '';
        const bTitle = b.title ?? '';
        return aTitle.localeCompare(bTitle);
      });
  }, [groupOperations, filterItems]);

  const triggers = useMemo(() => allOperations.filter((op) => op.isTrigger), [allOperations]);
  const actions = useMemo(() => allOperations.filter((op) => !op.isTrigger), [allOperations]);

  const connectorName = connector?.properties?.displayName ?? 'Connector';
  const connectorDescription = connector?.properties?.description;
  const connectorIcon = connector?.properties?.iconUri;

  // Show loading state
  if (isLoading || (!groupOperations && !isNullOrUndefined(connector))) {
    return (
      <div className={classes.container}>
        <div className={classes.header}>
          {connectorIcon && <img src={connectorIcon} alt={connectorName} className={classes.connectorIcon} />}
          <div className={classes.headerContent}>
            <div className={classes.connectorNameContainer}>
              <Text weight="semibold" size={400} className={classes.connectorName}>
                {connectorName}
              </Text>
              <FavoriteButton connectorId={connectorId} />
            </div>
            {connectorDescription ? (
              <Text size={300} className={classes.connectorDescription}>
                {connectorDescription}
              </Text>
            ) : null}
          </div>
        </div>
        <div className={classes.loadingContainer}>
          <Spinner size="medium" label="Loading operations..." />
        </div>
      </div>
    );
  }

  if (isNullOrUndefined(connector)) {
    return null;
  }

  return (
    <div className={classes.container}>
      <div className={classes.header}>
        {connectorIcon && <img src={connectorIcon} alt={connectorName} className={classes.connectorIcon} />}
        <div className={classes.headerContent}>
          <div className={classes.connectorNameContainer}>
            <Text weight="semibold" size={400} className={classes.connectorName}>
              {connectorName}
            </Text>
            <FavoriteButton connectorId={connectorId} />
          </div>
          {connectorDescription && (
            <Text size={300} className={classes.connectorDescription}>
              {connectorDescription}
            </Text>
          )}
        </div>
      </div>

      <OperationsAccordion
        triggers={triggers}
        actions={actions}
        isTrigger={isTrigger}
        isLoading={isLoading}
        onTriggerClick={(id: string, apiId?: string) => onOperationClick(id, apiId, true)}
        onActionClick={(id: string, apiId?: string) => onOperationClick(id, apiId, false)}
      />
    </div>
  );
};
