import { DesignerSearchBox } from '../..';
import { OperationCard } from '../../actionsummarycard/card';
import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import type { CommonPanelProps } from '../panelUtil';
import { Text, List, Panel } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Connector, Operation } from '@microsoft-logic-apps/utils';
import React, { useEffect } from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  onSearch: (term: string) => void;
  toggleCollapse: () => void;
  operationSearchResults: Operation[];
  connectorBrowse: Connector[];
} & CommonPanelProps;

const getResultCards = (results: Operation[]) => {
  return results.map((operation) => (
    <div key={operation.id}>
      <OperationCard
        iconUrl={operation.iconUri}
        title={operation.title}
        key={operation.id}
        id={operation.id}
        connectorName={operation.connector}
      ></OperationCard>
      <div key={operation.id} style={{ height: '60px', border: '1px' }}>
        <Text>{operation.title}</Text>
      </div>
    </div>
  ));
};

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

  const [searchResults, setSearchResults] = React.useState<JSX.Element[]>([]);
  useEffect(() => setSearchResults(getResultCards(props.operationSearchResults)), [props.operationSearchResults]);

  const onRenderOperationCell = React.useCallback((operation: Operation | undefined, index: number | undefined) => {
    if (!operation) return;
    return (
      <OperationCard
        iconUrl={operation.iconUri}
        title={operation.title}
        key={operation.id}
        id={operation.id}
        connectorName={operation.connector}
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
