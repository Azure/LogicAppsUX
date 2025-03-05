import type { IImageStyles, IImageStyleProps, IStyleFunctionOrObject } from '@fluentui/react';
import { Icon, Shimmer, ShimmerElementType, Spinner, SpinnerSize, Text, css } from '@fluentui/react';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import type { Template } from '@microsoft/logic-apps-shared';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { getConnectorAllCategories } from '@microsoft/designer-ui';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { getConnectorResources } from '../../../core/templates/utils/helper';
import { useEffect, useMemo } from 'react';
import type { ConnectorInfo } from '../../../core/templates/utils/queries';
import { useConnectorInfo } from '../../../core/templates/utils/queries';
import { Tooltip } from '@fluentui/react-components';
import { isConnectionValid } from '../../../core/utils/connectors/connections';
import { useSelector } from 'react-redux';
import type { RootState } from 'lib/core/state/templates/store';

export const ConnectorIcon = ({
  connectorId,
  operationId,
  classes,
}: {
  connectorId: string;
  classes: Record<string, string>;
  operationId?: string;
  styles?: IStyleFunctionOrObject<IImageStyleProps, IImageStyles>;
}) => {
  const { subscriptionId, location } = useSelector((state: RootState) => state.workflow);
  const {
    data: connector,
    isLoading,
    isError,
  } = useConnectorInfo(connectorId, operationId, /* useCachedData */ true, /* enabled */ !!subscriptionId && !!location);
  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  const wrappedIcon = (
    <div className={classes['root']}>
      <img className={classes['icon']} src={connector?.iconUrl} alt={connector?.displayName ?? connector?.id?.split('/')?.slice(-1)[0]} />
    </div>
  );

  if (!connector.displayName) {
    return wrappedIcon;
  }

  return (
    <Tooltip content={connector.displayName} relationship="label" positioning="below-start" withArrow showDelay={100} hideDelay={500}>
      {wrappedIcon}
    </Tooltip>
  );
};

export const ConnectorIconWithName = ({
  connectorId,
  operationId,
  classes,
  showProgress,
  onConnectorLoaded,
}: {
  connectorId: string;
  classes: Record<string, string>;
  operationId?: string;
  showProgress?: boolean;
  onConnectorLoaded?: (connector: ConnectorInfo) => void;
}) => {
  const { data: connector, isLoading } = useConnectorInfo(connectorId, operationId, /* useCachedData */ true);

  useEffect(() => {
    if (onConnectorLoaded && connector) {
      onConnectorLoaded(connector);
    }
  }, [connector, onConnectorLoaded]);

  if (showProgress && isLoading) {
    return (
      <div className={css(classes['root'], 'msla-template-create-progress-connector')}>
        <Shimmer
          className={classes['icon']}
          style={{ width: '20px', height: '20px', marginTop: 5 }}
          shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
          size={SpinnerSize.xSmall}
        />
        <Shimmer
          className={classes['text']}
          style={{ width: '70px', marginTop: 10 }}
          shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
          size={SpinnerSize.xSmall}
        />
      </div>
    );
  }

  return (
    <div className={classes['root']}>
      <img className={classes['icon']} src={connector?.iconUrl} />
      <Text className={classes['text']}>{connector?.displayName}</Text>
    </div>
  );
};

const textStyles = {
  connectorSubDetails: {
    fontSize: 13,
    color: '#8b8b8b',
    minWidth: 'fit-content',
  },
};

export const ConnectorWithDetails = ({ connectorId, kind }: Template.Connection) => {
  const { data: connector, isLoading, isError } = useConnector(connectorId, /* enabled */ true, /* getCachedData */ true);
  const { data: connections, isLoading: isConnectionsLoading } = useConnectionsForConnector(connectorId, /* shouldNotRefetch */ true);
  const connectorConnections = useMemo(() => connections?.filter(isConnectionValid), [connections]);
  const intl = useIntl();

  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  const allCategories = getConnectorAllCategories();
  const text = getConnectorResources(intl);
  return (
    <div className="msla-template-connector">
      {isLoading ? (
        <Shimmer
          className="msla-template-connector-box"
          shimmerElements={[{ type: ShimmerElementType.line, height: 50, verticalAlign: 'bottom', width: '100%' }]}
          size={SpinnerSize.xSmall}
        />
      ) : (
        <ConnectorIcon
          connectorId={connectorId}
          classes={{ root: 'msla-template-connector-box', icon: 'msla-template-connector-icon' }}
          styles={{ root: { width: 50, height: 50 } }}
        />
      )}
      <div className="msla-template-connector-details">
        {isLoading ? (
          <Shimmer
            className="msla-template-connector-name"
            style={{ width: '70%', marginTop: 10 }}
            shimmerElements={[{ type: ShimmerElementType.line, height: 12, verticalAlign: 'bottom', width: '100%' }]}
            size={SpinnerSize.xSmall}
          />
        ) : (
          <div className="msla-template-connector-name">{connector.properties?.displayName}</div>
        )}
        <div className="msla-template-connector-type">
          <Text style={textStyles.connectorSubDetails} className="msla-template-card-tag">
            {allCategories[kind ?? ''] ?? kind}
          </Text>
          <Icon style={{ padding: 5, color: '#8b8b8b', fontSize: 7 }} iconName="LocationDot" />
          {isConnectionsLoading ? (
            <Shimmer
              className="msla-template-card-tag"
              style={{ width: '70px', marginTop: 5 }}
              shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
              size={SpinnerSize.xSmall}
            />
          ) : (connectorConnections ?? []).length > 0 ? (
            <Text style={{ ...textStyles.connectorSubDetails, color: '#50821b' }}>{text.connected}</Text>
          ) : (
            <Text style={textStyles.connectorSubDetails} className="msla-template-card-tag">
              {text.notConnected}
            </Text>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConnectorConnectionStatus = ({
  connectorId,
  connectionKey,
  hasConnection,
  intl,
}: { connectorId: string; connectionKey: string; hasConnection: boolean; intl: IntlShape }) => {
  const { data: connector, isLoading } = useConnector(connectorId, /* enabled */ true, /* getCachedData */ true);
  const texts = getConnectorResources(intl);

  return (
    <div className="msla-templates-tab-review-section-details">
      {isLoading ? (
        <div className="msla-templates-tab-review-section-details-title">
          <Shimmer
            style={{ width: '70%', marginTop: 5 }}
            shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
            size={SpinnerSize.xSmall}
          />
        </div>
      ) : (
        <Text className="msla-templates-tab-review-section-details-title">
          {connector?.properties?.displayName} ({connectionKey})
        </Text>
      )}
      <Text className="msla-templates-tab-review-section-details-value">{hasConnection ? texts.connected : texts.notConnected}</Text>
    </div>
  );
};
