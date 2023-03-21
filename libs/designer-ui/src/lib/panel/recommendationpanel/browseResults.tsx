import NoResultsSvg from '../../../assets/search/noResults.svg';
import { ConnectorSummaryCard } from '../../connectorsummarycard';
import { getConnectorCategoryString } from '../../utils';
import { List, Spinner, Text } from '@fluentui/react';
import type { Connector } from '@microsoft/utils-logic-apps';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useIntl } from 'react-intl';

export type BrowseGridProps = {
  onConnectorSelected: (connectorId: string) => void;
  connectors: Connector[];
  isLoading: boolean;
};

export const BrowseGrid = (props: BrowseGridProps) => {
  const { connectors, onConnectorSelected, isLoading } = props;

  const intl = useIntl();
  const ref = useRef(null);
  const [forceSingleCol, setForceSingleCol] = useState(false);

  const checkCol = useCallback(() => {
    setForceSingleCol((ref.current as any)?.clientWidth < 560);
  }, []);
  window.onresize = checkCol;
  useLayoutEffect(checkCol, [checkCol]);

  const onRenderCell = useCallback(
    (connector?: Connector, _index?: number) => {
      if (!connector) return;
      const { displayName, description, iconUri, brandColor, generalInformation } = connector.properties;
      return (
        <div className="mlsa-browse-list-tile-wrapper">
          <div className="msla-browse-list-tile" style={{ width: forceSingleCol ? '100%' : '50%' }}>
            <ConnectorSummaryCard
              key={connector.id}
              id={connector.id}
              connectorName={displayName}
              description={description || generalInformation?.description}
              iconUrl={iconUri}
              brandColor={brandColor}
              onClick={onConnectorSelected}
              category={getConnectorCategoryString(connector.id)}
            />
          </div>
        </div>
      );
    },
    [forceSingleCol, onConnectorSelected]
  );

  const noResultsText = intl.formatMessage({
    defaultMessage: 'No results found for the specified filters',
    description: 'Text to show when there are no browse results with the given filters',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading all connectors...',
    description: 'Message to show under the loading icon when loading connectors',
  });

  if (!isLoading && connectors.length === 0)
    return (
      <div className="msla-no-results-container">
        <img src={NoResultsSvg} alt={noResultsText?.toString()} />
        <Text>{noResultsText}</Text>
      </div>
    );

  return (
    <div ref={ref} className="msla-browse-list">
      {isLoading && (
        <div style={{ marginBottom: '16px' }}>
          <Spinner label={loadingText} ariaLive="assertive" labelPosition="right" />
        </div>
      )}
      <List onRenderCell={onRenderCell} items={connectors} getPageHeight={() => (forceSingleCol ? 80 * 10 : 80 * 5)} />
    </div>
  );
};
