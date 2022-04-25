import { Text, Image, ImageFit } from '@fluentui/react';
import { getIntl } from '@microsoft-logic-apps/intl';
import type { MessageDescriptor } from 'react-intl';

export type OperationCardProps = {
  title: string;
  subtitle?: string;
  id: string;
  iconUrl: string;
  connectorName: string;
  category: 'Built-in' | 'Azure' | '';
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationCard = (props: OperationCardProps) => {
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
    <div className="msla-operation-card">
      <div>
        <div className="msla-card-title-container">
          <Image imageFit={ImageFit.contain} className="msla-card-logo" src={props.iconUrl} alt={logoAltText}></Image>
        </div>
        <div className="msla-card-title-container">
          <Text className="msla-card-title">{props.title}</Text>
        </div>
      </div>
      <Text className="msla-card-description">{props.subtitle}</Text>
      <div className="msla-tag-container">
        <Text className="msla-tag">{props.connectorName}</Text>
        <Text className="msla-tag">Trigger</Text>
        <Text className="msla-tag">{props.category}</Text>
      </div>
    </div>
  );
};
