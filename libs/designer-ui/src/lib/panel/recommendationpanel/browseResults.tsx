import { ConnectorSummaryCard } from '../../connectorsummarycard/connectorsummarycard';
import { Stack } from '@fluentui/react';
import type { Connector } from '@microsoft-logic-apps/utils';

export type BrowseGridProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectorBrowse: Connector[];
};

export const BrowseGrid = (props: BrowseGridProps) => {
  return (
    <div className="msla-result-list">
      <Stack horizontal wrap>
        {props.connectorBrowse.map((connector) => {
          const properties = connector.properties;

          return (
            <ConnectorSummaryCard
              key={connector.id}
              onConnectorSelected={props.onConnectorSelected}
              connectorName={properties.displayName}
              description={properties['description'] || ''}
              id={connector.id}
              iconUrl={properties.iconUri}
              brandColor={properties.brandColor}
            ></ConnectorSummaryCard>
          );
        })}
      </Stack>
    </div>
  );
};
