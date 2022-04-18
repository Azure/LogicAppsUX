import { Text, Image, ImageFit } from '@fluentui/react';

export type OperationCardProps = {
  title: string;
  subtitle?: string;
  id: string;
  iconUrl: string;
  connectorName: string;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationCard = (props: OperationCardProps) => {
  return (
    <div className="msla-operation-card">
      <div style={{ height: '22px' }}>
        <div style={{ display: 'inline-block' }}>
          <Image imageFit={ImageFit.contain} className="msla-card-logo" src={props.iconUrl} alt={'logo for ' + props.title}></Image>
        </div>
        <div style={{ display: 'inline-block' }}>
          <Text className="msla-card-title">{props.title}</Text>
        </div>
      </div>
      <Text className="msla-card-description">{props.subtitle}</Text>
      <div className="msla-tag-container">
        <Text className="msla-tag">{props.connectorName}</Text>
      </div>
    </div>
  );
};
