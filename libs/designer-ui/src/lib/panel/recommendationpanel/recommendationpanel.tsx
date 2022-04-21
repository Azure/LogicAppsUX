import { DesignerSearchBox } from '../..';
import { OperationCard } from '../../actionsummarycard/card';
import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import type { CommonPanelProps } from '../panelUtil';
import { Text, List, Panel, DefaultButton } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { Connector, OperationSearchResult } from '@microsoft-logic-apps/utils';
import React from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  onSearch: (term: string) => void;
  toggleCollapse: () => void;
  operationSearchResults: OperationSearchResult[];
  connectorBrowse: Connector[];
} & CommonPanelProps;

export const RecommendationPanel = (props: RecommendationPanelProps) => {
  type Filter = 'Built-in' | 'Azure' | '';
  const [filter, setFilter] = React.useState<Filter>('');

  const [operationSearchResults, setOperationSearchResults] = React.useState([...props.operationSearchResults]);

  React.useEffect(() => {
    setOperationSearchResults([...props.operationSearchResults]);
  }, [props.operationSearchResults]);

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
        category={operation.properties.category}
        iconUrl={operation.properties.api.iconUri}
        title={operation.properties.summary}
        key={operation.id}
        id={operation.id}
        connectorName={operation.properties.api.displayName}
        subtitle={operation.properties.description}
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

  const callSetFilter = (term: Filter) => {
    setFilter(term);
    const filteredResult = props.operationSearchResults.filter((op) => {
      const category = op.properties.category;
      if (filter && category !== filter) {
        return false;
      }
      return true;
    });
    setOperationSearchResults(filteredResult);
  };

  const filterButton = (text: Filter) => {
    return (
      <DefaultButton onClick={(e) => callSetFilter(text)} className={`msla-filter-btn ${filter === text ? 'msla-filter-selected' : ''}`}>
        {text}
      </DefaultButton>
    );
  };

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
        <div>
          <div className="msla-filter-container" style={{ padding: '5px' }}>
            <Text style={{ display: 'block' }}>Filters</Text>
            <div style={{ display: 'block' }}>
              {filterButton('Built-in')}
              {filterButton('Azure')}
            </div>
          </div>
        </div>
        {props.operationSearchResults.length !== 0 ? (
          <List items={operationSearchResults} onRenderCell={onRenderOperationCell}></List>
        ) : (
          <List items={props.connectorBrowse} onRenderCell={onRenderConnectorCell}></List>
        )}
      </div>
    </Panel>
  );
};
