import type { IImageStyles, IImageStyleProps, IStyleFunctionOrObject } from '@fluentui/react';
import { Icon, ImageFit, Shimmer, ShimmerElementType, Spinner, SpinnerSize, Text } from '@fluentui/react';
import { useConnectorOnly } from '../../../core/state/connection/connectionSelector';
import type { Template } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';
import { getConnectorAllCategories } from '@microsoft/designer-ui';
import { useConnectionsForConnector } from '../../../core/queries/connections';

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

export const ConnectorIconWithName = ({ connectorId }: { connectorId: string }) => {
  const { data: connector, isLoading, isError } = useConnectorOnly(connectorId);
  const icon = isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;

  return (
    <div className="msla-template-connector-menuitem">
      {connector ? (
        <Icon
          className="msla-template-connector-menuitem-icon"
          imageProps={{
            styles: iconStyles,
            src: connector.properties.iconUrl ?? connector.properties.iconUri,
            imageFit: ImageFit.centerContain,
          }}
        />
      ) : (
        icon
      )}
      <Text className="msla-template-connector-menuitem-text">{connector?.properties.displayName}</Text>
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
  const { data: connections, isLoading: isConnectionsLoading } = useConnectionsForConnector(connectorId);
  const intl = useIntl();

  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  const allCategories = getConnectorAllCategories();
  const text = {
    connected: intl.formatMessage({
      defaultMessage: 'Connected',
      id: 'oOGTSo',
      description: 'Connected text',
    }),
    notConnected: intl.formatMessage({
      defaultMessage: 'Not Connected',
      id: '3HrFPS',
      description: 'Not Connected text',
    }),
  };
  return (
    <div className="msla-template-connector">
      <ConnectorIcon
        connectorId={connectorId}
        classes={{ root: 'msla-template-connector-box', icon: 'msla-template-connector-icon' }}
        styles={{ root: { width: 50, height: 50 }, image: { width: 'calc(60%)', height: 'calc(60%)' } }}
      />
      <div className="msla-template-connector-details">
        <div className="msla-template-connector-name">{connector.properties.displayName}</div>
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
