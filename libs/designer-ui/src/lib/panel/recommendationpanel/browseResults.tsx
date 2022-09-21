import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { getConnectorCategoryString } from '../../utils';
import { List } from '@fluentui/react';
import type { Connector } from '@microsoft-logic-apps/utils';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';

export type BrowseGridProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectorBrowse: Connector[];
};

export const BrowseGrid = (props: BrowseGridProps) => {
  const ref = useRef(null);
  const [forceSingleCol, setForceSingleCol] = useState(true);

  const checkCol = useCallback(() => {
    setForceSingleCol((ref.current as any)?.clientWidth < 560);
  }, []);
  window.onresize = checkCol;
  useLayoutEffect(checkCol, [checkCol]);

  const onRenderCell = useCallback(
    (connector?: Connector, _index?: number) => {
      if (!connector) return;
      const properties = connector.properties;
      return (
        <div className="mlsa-browse-list-tile-wrapper">
          <div className="msla-browse-list-tile" style={{ width: forceSingleCol ? '100%' : '50%' }}>
            <ConnectorSummaryCard
              key={connector.id}
              id={connector.id}
              connectorName={properties.displayName}
              description={properties.description || ''}
              iconUrl={properties.iconUri}
              brandColor={properties.brandColor}
              onClick={props.onConnectorSelected}
              category={getConnectorCategoryString(connector.id)}
            />
          </div>
        </div>
      );
    },
    [forceSingleCol, props.onConnectorSelected]
  );

  return (
    <div ref={ref} className="msla-result-list">
      <List onRenderCell={onRenderCell} items={props.connectorBrowse} getPageHeight={() => (forceSingleCol ? 80 * 10 : 80 * 5)} />
    </div>
  );
};
