import { Icon, ImageFit, Spinner, SpinnerSize, Text } from '@fluentui/react';
import { useConnectorOnly } from '../../../core/state/connection/connectionSelector';

const iconStyles = {
  root: {
    width: 20,
    height: 20,
  },
};

export const ConnectorIcon = ({ connectorId }: { connectorId: string }) => {
  const { data: connector, isLoading, isError } = useConnectorOnly(connectorId);
  if (!connector) {
    return isLoading ? <Spinner size={SpinnerSize.small} /> : isError ? <Icon iconName="Error" /> : <Icon iconName="Unknown" />;
  }

  return (
    <Icon
      className="msla-template-connector-icon"
      imageProps={{
        styles: iconStyles,
        src: connector.properties.iconUrl ?? connector.properties.iconUri,
        imageFit: ImageFit.centerContain,
      }}
    />
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
