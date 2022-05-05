import { Text, Image, ImageFit } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';

export type ConnectorSummaryCardProps = {
  connectorName: string;
  description?: string;
  id: string;
  iconUrl: string;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const ConnectorSummaryCard = (props: ConnectorSummaryCardProps) => {
  const intl = getIntl();

  const logoAltText = intl.formatMessage(
    {
      defaultMessage: 'logo for {connectorName}',
      description: 'Alternate text for accessibility, describes logo for corresponding connector',
    },
    {
      connectorName: props.connectorName,
    }
  );

  return (
    <div className="msla-connector-card">
      <div>
        <div className="msla-card-title-container">
          <Image imageFit={ImageFit.contain} className="msla-card-logo" src={props.iconUrl} alt={logoAltText}></Image>
        </div>
        <div className="msla-card-title-container">
          <Text className="msla-card-title">{props.connectorName}</Text>
        </div>
      </div>
      <Text className="msla-card-description">{props.description}</Text>
    </div>
  );
};
