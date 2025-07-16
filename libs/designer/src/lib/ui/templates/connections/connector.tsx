import type { IImageStyles, IImageStyleProps, IStyleFunctionOrObject } from '@fluentui/react';
import { Icon, Shimmer, ShimmerElementType, Spinner, SpinnerSize, css } from '@fluentui/react';
import { useConnector } from '../../../core/state/connection/connectionSelector';
import { type Template, getPropertyValue } from '@microsoft/logic-apps-shared';
import { getConnectorAllCategories } from '@microsoft/designer-ui';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { useEffect, useMemo } from 'react';
import type { ConnectorInfo } from '../../../core/templates/utils/queries';
import { useConnectorInfo } from '../../../core/templates/utils/queries';
import { tokens, Tooltip, Text, Link } from '@fluentui/react-components';
import { isConnectionValid } from '../../../core/utils/connectors/connections';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../core/state/templates/store';
import { Checkmark16Filled, Dismiss16Filled } from '@fluentui/react-icons';
import { useConnectorStatusStrings } from '../templatesStrings';
import DefaultIcon from '../../../common/images/recommendation/defaulticon.svg';

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
  onNameClick,
}: {
  connectorId: string;
  classes: Record<string, string>;
  operationId?: string;
  showProgress?: boolean;
  onConnectorLoaded?: (connector: ConnectorInfo) => void;
  onNameClick?: () => void;
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
      <img className={classes['icon']} src={connector?.iconUrl ?? DefaultIcon} />
      {onNameClick ? (
        <Link className={classes['text']} as="button" onClick={onNameClick}>
          {connector?.displayName}
        </Link>
      ) : (
        <Text className={classes['text']}>{connector?.displayName}</Text>
      )}
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

export const ConnectorWithDetails = ({ id, kind }: Template.FeaturedConnector) => {
  const { data: connector, isLoading, isError } = useConnector(id, /* enabled */ true, /* getCachedData */ true);
  const { data: connections, isLoading: isConnectionsLoading } = useConnectionsForConnector(id, /* shouldNotRefetch */ true);
  const connectorConnections = useMemo(() => connections?.filter(isConnectionValid), [connections]);
  const text = useConnectorStatusStrings();

  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  const allCategories = getConnectorAllCategories();
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
          connectorId={id}
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
          <Text style={textStyles.connectorSubDetails}>{getPropertyValue(allCategories, kind ?? '') ?? kind}</Text>
          <Text style={textStyles.connectorSubDetails}>•</Text>
          {isConnectionsLoading ? (
            <Shimmer
              style={{ width: '70px', marginTop: 5 }}
              shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
              size={SpinnerSize.xSmall}
            />
          ) : (connectorConnections ?? []).length > 0 ? (
            <Text style={{ ...textStyles.connectorSubDetails, color: '#50821b' }}>{text.connected}</Text>
          ) : (
            <Text style={textStyles.connectorSubDetails}>{text.notConnected}</Text>
          )}
        </div>
      </div>
    </div>
  );
};

export const ConnectorConnectionName = ({ connectorId, connectionKey }: { connectorId: string; connectionKey: string | undefined }) => {
  const { data: connector, isLoading } = useConnector(connectorId, /* enabled */ true, /* getCachedData */ true);

  return isLoading ? (
    <Shimmer
      style={{ width: '70%', marginTop: 5 }}
      shimmerElements={[{ type: ShimmerElementType.line, height: 10, verticalAlign: 'bottom', width: '100%' }]}
      size={SpinnerSize.xSmall}
    />
  ) : (
    <Text>
      {connector?.properties?.displayName}
      {connectionKey ? ` (${connectionKey})` : ''}
    </Text>
  );
};

export const CompactConnectorConnectionStatus = ({ connectorId, hasConnection }: { connectorId: string; hasConnection: boolean }) => {
  const { data: connector, isLoading } = useConnector(connectorId, /* enabled */ true, /* getCachedData */ true);

  return (
    <div className="msla-templates-tab-review-section-details">
      {isLoading ? (
        <Shimmer
          style={{ width: '70%', marginTop: 5 }}
          shimmerElements={[{ type: ShimmerElementType.line, height: 15, verticalAlign: 'bottom', width: '100%' }]}
          size={SpinnerSize.xSmall}
        />
      ) : (
        <div className="msla-connection-status-compact">
          {hasConnection ? (
            <Checkmark16Filled color={tokens.colorStatusSuccessForeground1} />
          ) : (
            <Dismiss16Filled color={tokens.colorStatusDangerForeground1} />
          )}
          <img
            className="msla-connection-status-compact-icon"
            src={connector?.properties?.iconUrl}
            alt={connector?.properties?.displayName ?? connectorId}
          />
          <Text weight="semibold">{connector?.properties?.displayName ?? connectorId}</Text>
        </div>
      )}
    </div>
  );
};
