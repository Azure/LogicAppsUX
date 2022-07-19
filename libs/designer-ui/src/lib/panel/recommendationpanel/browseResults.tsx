import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import { List } from '@fluentui/react';
import type { Connector } from '@microsoft-logic-apps/utils';
import React from 'react';

export type BrowseGridProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectorBrowse: Connector[];
};

export const BrowseGrid = (props: BrowseGridProps) => {
  const onRenderConnectorCell = React.useCallback(
    (connector: Connector | undefined, _index: number | undefined) => {
      if (!connector) return;
      const properties = connector.properties;

      return (
        <ConnectorSummaryCard
          onConnectorSelected={props.onConnectorSelected}
          connectorName={properties.displayName}
          description={properties['description'] || ''}
          id={connector.id}
          iconUrl={properties.iconUri}
          brandColor={properties.brandColor}
        ></ConnectorSummaryCard>
      );
    },
    [props.onConnectorSelected]
  );

  return (
    <div className="msla-result-list">
      <List items={props.connectorBrowse} onRenderCell={onRenderConnectorCell}></List>
    </div>
  );
};
