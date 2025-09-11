import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { Accordion } from '@fluentui/react-components';
import { addOperation, type AppDispatch } from '../../../../core';
import { useDiscoveryPanelNewNodePosition, useDiscoveryPanelRelationshipIds } from '../../../../core/state/panel/panelSelectors';
import { useOperationsAccordionStyles } from './styles/OperationsAccordion.styles';
import { recurrenceOperation, requestOperation } from '@microsoft/logic-apps-shared';
import { OperationAccordionItem } from './operationAccordionItem';
import type { OperationActionData } from '@microsoft/designer-ui';

export interface OperationsAccordionProps {
  triggers: OperationActionData[];
  actions: OperationActionData[];
  isTrigger: boolean;
  isLoading: boolean;
  onTriggerClick: (id: string, apiId?: string) => void;
  onActionClick: (id: string, apiId?: string) => void;
}

export const OperationsAccordion = ({
  triggers,
  actions,
  isTrigger,
  isLoading,
  onTriggerClick,
  onActionClick,
}: OperationsAccordionProps) => {
  const classes = useOperationsAccordionStyles();
  const dispatch = useDispatch<AppDispatch>();
  const relationshipIds = useDiscoveryPanelRelationshipIds();
  const newNodePosition = useDiscoveryPanelNewNodePosition();

  const intl = useIntl();

  const handleSuggestedTriggerClick = useCallback(
    (operation: any) => {
      // For suggested triggers, add directly using dispatch
      const nodeId = `${operation.properties.summary ?? operation.name ?? 'trigger'}`.replaceAll(' ', '_');
      dispatch(
        addOperation({
          operation,
          relationshipIds,
          nodeId,
          isParallelBranch: false,
          isTrigger: true,
          newNodePosition,
        })
      );
    },
    [dispatch, relationshipIds, newNodePosition]
  );

  const noTriggersText = intl.formatMessage({
    defaultMessage: 'This connector has no triggers available. Users often combine the following triggers with actions.',
    id: 'oA5+TG',
    description: 'Message when connector has no triggers available',
  });

  const actionsNeedTriggerText = intl.formatMessage({
    defaultMessage: 'Actions need to be triggered by another node, e.g. at regular intervals with the Schedule node',
    id: 'Q2X3qQ',
    description: 'Message explaining that actions need triggers',
  });

  const triggersTitle = intl.formatMessage({
    defaultMessage: 'Triggers',
    id: 'skCotF',
    description: 'Triggers accordion title',
  });

  const actionsTitle = intl.formatMessage({
    defaultMessage: 'Actions',
    id: 'bou7hY',
    description: 'Actions accordion title',
  });

  const suggestedTriggersTitle = intl.formatMessage({
    defaultMessage: 'Suggested Triggers',
    id: 'swt55B',
    description: 'Suggested triggers accordion title',
  });

  // Suggested triggers as OperationActionData for Grid component
  const suggestedTriggers = [
    {
      id: recurrenceOperation.id,
      title: recurrenceOperation.properties.summary,
      description: recurrenceOperation.properties.description,
      iconUri: recurrenceOperation.properties.iconUri,
      brandColor: recurrenceOperation.properties.brandColor,
      isTrigger: true,
      apiId: recurrenceOperation.properties?.api?.id,
    },
    {
      id: requestOperation.id,
      title: requestOperation.properties.summary,
      description: requestOperation.properties.description,
      iconUri: requestOperation.properties.iconUri,
      brandColor: requestOperation.properties.brandColor,
      isTrigger: true,
      apiId: requestOperation.properties?.api?.id,
    },
  ];

  const handleSuggestedTriggerGridClick = useCallback(
    (operationId: string) => {
      const operation = operationId === recurrenceOperation.id ? recurrenceOperation : requestOperation;
      handleSuggestedTriggerClick(operation);
    },
    [handleSuggestedTriggerClick]
  );

  const defaultOpenItems = useMemo(() => {
    const items: string[] = [];

    if (isTrigger) {
      // In trigger mode, always try to open triggers first, but fallback to suggested
      items.push('triggers');
      items.push('suggested-triggers');
      // Also open actions accordion when no triggers - helps users see what actions are available
      if (triggers.length === 0) {
        items.push('actions');
      }
    } else {
      // In action mode, always open actions
      items.push('actions');
    }

    return items;
  }, [isTrigger, triggers.length]);

  return (
    <div className={classes.container}>
      <Accordion multiple collapsible defaultOpenItems={defaultOpenItems}>
        {isTrigger ? (
          /* TRIGGER MODE: Show triggers first, then actions */
          <>
            {/* Triggers Section - show real triggers if available */}
            {triggers.length > 0 ? (
              <OperationAccordionItem
                value="triggers"
                title={triggersTitle}
                items={triggers}
                isLoading={isLoading}
                onOperationClick={onTriggerClick}
              />
            ) : (
              /* No triggers - show suggested triggers in open accordion */
              <OperationAccordionItem
                value="suggested-triggers"
                title={suggestedTriggersTitle}
                items={suggestedTriggers}
                isLoading={false}
                onOperationClick={handleSuggestedTriggerGridClick}
                messageText={noTriggersText}
                showMessage={true}
              />
            )}

            {/* Actions Section - always show if there are actions */}
            {actions.length > 0 && (
              <OperationAccordionItem
                value="actions"
                title={actionsTitle}
                items={actions}
                isLoading={isLoading}
                onOperationClick={onActionClick}
                messageText={actionsNeedTriggerText}
                showMessage={triggers.length === 0}
              />
            )}
          </>
        ) : (
          /* ACTION MODE: Show actions first, then triggers */
          <>
            {/* Actions Section - show first */}
            {actions.length > 0 && (
              <OperationAccordionItem
                value="actions"
                title={actionsTitle}
                items={actions}
                isLoading={isLoading}
                onOperationClick={onActionClick}
              />
            )}

            {/* Triggers Section - only show if connector has triggers */}
            {triggers.length > 0 && (
              <OperationAccordionItem
                value="triggers"
                title={triggersTitle}
                items={triggers}
                isLoading={isLoading}
                onOperationClick={onTriggerClick}
              />
            )}
          </>
        )}
      </Accordion>
    </div>
  );
};
