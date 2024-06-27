import type { IImageStyles, IImageStyleProps, IStyleFunctionOrObject } from '@fluentui/react';
import { Icon, ImageFit, Shimmer, ShimmerElementType, Spinner, SpinnerSize, Text, css } from '@fluentui/react';
import { useConnectorOnly } from '../../../core/state/connection/connectionSelector';
import type { Connector, Template } from '@microsoft/logic-apps-shared';
import type { IntlShape } from 'react-intl';
import { useIntl } from 'react-intl';
import { getConnectorAllCategories } from '@microsoft/designer-ui';
import { useConnectionsForConnector } from '../../../core/queries/connections';
import { getConnectorResources } from '../../../core/templates/utils/helper';
import { useEffect } from 'react';

const iconStyles = {
  root: {
    width: 20,
    height: 20,
  },
};

export const ConnectorIcon = ({
  connectorId,
  styles,
  classes,
}: { connectorId: string; classes: Record<string, string>; styles?: IStyleFunctionOrObject<IImageStyleProps, IImageStyles> }) => {
  const { data: connector, isLoading, isError } = useConnectorOnly(connectorId);
  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  return (
    <div className={classes['root']}>
      <Icon
        className={classes['icon']}
        imageProps={{
          styles: styles ?? iconStyles,
          src: connector.properties.iconUrl ?? connector.properties.iconUri,
          imageFit: ImageFit.centerContain,
        }}
      />
    </div>
  );
};

export const ConnectorIconWithName = ({
  connectorId,
  classes,
  showProgress,
  onConnectorLoaded,
}: {
  connectorId: string;
  classes: Record<string, string>;
  showProgress?: boolean;
  onConnectorLoaded?: (connector: Connector) => void;
}) => {
  const { data: connector, isLoading } = useConnectorOnly(connectorId);

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
      <img className={classes['icon']} src={connector?.properties.iconUrl ?? connector?.properties.iconUri} />
      <Text className={classes['text']}>{connector?.properties.displayName}</Text>
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
  const { data: connector, isLoading, isError } = useConnectorOnly(connectorId);
  const { data: connections, isLoading: isConnectionsLoading } = useConnectionsForConnector(connectorId, /* shouldNotRefetch */ true);
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
          styles={{ root: { width: 50, height: 50 }, image: { width: 'calc(60%)', height: 'calc(60%)' } }}
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
          <div className="msla-template-connector-name">{connector.properties.displayName}</div>
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
          ) : (connections ?? []).length > 0 ? (
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
  hasConnection,
  intl,
}: { connectorId: string; hasConnection: boolean; intl: IntlShape }) => {
  const { data: connector, isLoading } = useConnectorOnly(connectorId);
  const texts = getConnectorResources(intl);
  const fontStyle = { color: hasConnection ? '#50821b' : '#8b8b8b' };

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
        <Text className="msla-templates-tab-review-section-details-title">{connector?.properties.displayName}</Text>
      )}
      <Text style={fontStyle} className="msla-templates-tab-review-section-details-value">
        {hasConnection ? texts.connected : texts.notConnected}
      </Text>
    </div>
  );
};
