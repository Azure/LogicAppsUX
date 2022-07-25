import { OperationCard } from '../../actionsummarycard/card';
import { DesignerSearchBox } from '../../searchbox';
import type { CommonPanelProps } from '../panelUtil';
import { List, Panel, PanelType, Pivot, PivotItem } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { OperationDiscoveryResult } from '@microsoft-logic-apps/utils';
import type { PropsWithChildren } from 'react';
import React from 'react';

export type RecommendationPanelProps = {
  placeholder: string;
  onSearch: (term: string) => void;
  toggleCollapse: () => void;
  operationSearchResults: OperationDiscoveryResult[];
  onOperationClick: (id: string) => void;
} & CommonPanelProps;

export const RecommendationPanel: React.FC<PropsWithChildren<RecommendationPanelProps>> = (props) => {
  const intl = getIntl();

  const [operationSearchResults, setOperationSearchResults] = React.useState([...props.operationSearchResults]);

  React.useEffect(() => {
    setOperationSearchResults([...props.operationSearchResults]);
  }, [props.operationSearchResults]);

  const panelLabel = intl.formatMessage({
    defaultMessage: 'panel',
    description: 'recommendation panel',
  });

  const header = intl.formatMessage({
    defaultMessage: 'Operations',
    description: 'Operations in search panel',
  });

  const browsePivotAriaLabel = intl.formatMessage({
    defaultMessage: 'Choose which view to browse from',
    description: 'Aria label for pivot to determine browse view',
  });

  const onRenderOperationCell = React.useCallback(
    (operation: OperationDiscoveryResult | undefined, _index: number | undefined) => {
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

  const browseConnectorsPivotText = intl.formatMessage({
    defaultMessage: 'Connectors',
    description: 'Selected view connector for browse',
  });

  return (
    <Panel
      headerText={header}
      aria-label={panelLabel}
      type={PanelType.medium}
      isOpen={!props.isCollapsed}
      onDismiss={props.toggleCollapse}
      closeButtonAriaLabel="close"
    >
      <DesignerSearchBox onSearch={props.onSearch}></DesignerSearchBox>
      <Pivot aria-label={browsePivotAriaLabel}>
        <PivotItem
          headerText={browseConnectorsPivotText}
          headerButtonProps={{
            'data-order': 1,
            'data-title': 'My Files Title',
          }}
        ></PivotItem>
      </Pivot>
      {props.operationSearchResults.length !== 0 ? (
        <List items={operationSearchResults} onRenderCell={onRenderOperationCell}></List>
      ) : (
        props.children
      )}
    </Panel>
  );
};
