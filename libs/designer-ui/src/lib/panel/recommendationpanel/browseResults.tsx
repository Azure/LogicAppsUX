import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { getConnectorCategoryString } from '../../utils';
import type { Connector } from '@microsoft-logic-apps/utils';

export type BrowseGridProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectorBrowse: Connector[];
};

export const BrowseGrid = (props: BrowseGridProps) => {
  return (
    <div className="msla-result-list">
      <div className="msla-browse-results-container">
        {props.connectorBrowse.map((connector) => {
          const properties = connector.properties;

          return (
            <ConnectorSummaryCard
              key={connector.id}
              id={connector.id}
              connectorName={properties.displayName}
              description={properties['description'] || ''}
              iconUrl={properties.iconUri}
              brandColor={properties.brandColor}
              onClick={props.onConnectorSelected}
              category={getConnectorCategoryString(connector.id)}
            />
          );
        })}
      </div>
    </div>
  );
};
