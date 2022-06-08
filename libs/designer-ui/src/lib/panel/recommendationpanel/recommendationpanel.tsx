import { OperationCard } from '../../actionsummarycard/card';
import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import { DesignerSearchBox } from '../../searchbox';
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
  onOperationClick: (id: string) => void;
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

  const onRenderOperationCell = React.useCallback(
    (operation: OperationSearchResult | undefined, _index: number | undefined) => {
      if (!operation) return;
      const properties = operation.properties;

      return (
        <OperationCard
          onClick={props.onOperationClick}
          category={properties.category}
          iconUrl={properties.api.iconUri}
          title={properties.summary}
          key={operation.id}
          id={operation.id}
          connectorName={properties.api.displayName}
          subtitle={properties.description}
        ></OperationCard>
      );
    },
    [props.onOperationClick]
  );

  const onRenderConnectorCell = React.useCallback((connector: Connector | undefined, _index: number | undefined) => {
    if (!connector) return;
    const properties = connector.properties;

    return (
      <ConnectorSummaryCard
        connectorName={properties.displayName}
        description={properties['description'] || ''}
        id={connector.id}
        iconUrl={properties.iconUri}
        brandColor={properties.brandColor}
      ></ConnectorSummaryCard>
    );
  }, []);

  const callSetFilter = (term: Filter) => {
    setFilter(term);
    const filteredResult = props.operationSearchResults.filter((op) => {
      const category = op.properties.category;
      if (term && category !== term) {
        return false;
      }
      return true;
    });
    setOperationSearchResults(filteredResult);
  };

  const filterButton = (text: Filter) => {
    return (
      <DefaultButton onClick={() => callSetFilter(text)} className={`msla-filter-btn ${filter === text ? 'msla-filter-selected' : ''}`}>
        {text}
      </DefaultButton>
    );
  };

  const filterHeader = intl.formatMessage({
    defaultMessage: 'Filters',
    description: 'Header to show that users can select below filters to narrow down results',
  });

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
          <div className="msla-filter-container">
            <Text className="msla-block">{filterHeader}</Text>
            <div className="msla-block">
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
