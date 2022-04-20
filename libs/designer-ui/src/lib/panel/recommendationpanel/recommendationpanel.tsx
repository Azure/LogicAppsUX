import { DesignerSearchBox } from '../..';
import { OperationCard } from '../../actionsummarycard/card';
import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import type { CommonPanelProps } from '../panelUtil';
import { Text, List, Panel } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Connector, Operation, OperationSearchResult } from '@microsoft-logic-apps/utils';
import React, { useEffect } from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  onSearch: (term: string) => void;
  toggleCollapse: () => void;
  operationSearchResults: OperationSearchResult[];
  connectorBrowse: Connector[];
} & CommonPanelProps;

export const RecommendationPanel = (props: RecommendationPanelProps) => {
  const intl = getIntl();

  const panelLabel = intl.formatMessage({
    defaultMessage: 'panel',
    description: 'recommendation panel',
  });
  const header = intl.formatMessage({
    defaultMessage: 'Operations',
    description: 'Operations in search panel',
  });

  const onRenderOperationCell = React.useCallback((operation: OperationSearchResult | undefined, index: number | undefined) => {
    if (!operation) return;
    return (
      <OperationCard
        iconUrl={operation.properties.api.iconUri}
        title={operation.properties.summary}
        key={operation.id}
        id={operation.id}
        connectorName={operation.properties.api.displayName}
      ></OperationCard>
    );
  }, []);

  const onRenderConnectorCell = React.useCallback((connector: Connector | undefined, index: number | undefined) => {
    if (!connector) return;

    return (
      <ConnectorSummaryCard
        connectorName={connector.properties.displayName}
        description={connector.properties['description'] ? connector.properties['description'] : ''}
        id={connector.id}
        iconUrl={connector.properties.iconUri}
        brandColor={connector.properties.brandColor}
      ></ConnectorSummaryCard>
    );
  }, []);

  return (
    <Panel
      headerText={header}
      aria-label={panelLabel}
      customWidth={props.width}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      closeButtonAriaLabel="close"
    >
      <DesignerSearchBox onSearch={props.onSearch}></DesignerSearchBox>
      <div className="msla-result-list">
        {props.operationSearchResults.length !== 0 ? (
          <List items={props.operationSearchResults} onRenderCell={onRenderOperationCell}></List>
        ) : (
          <List items={props.connectorBrowse} onRenderCell={onRenderConnectorCell}></List>
        )}
      </div>
    </Panel>
  );
};
