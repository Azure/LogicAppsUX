import { Text, Image } from '@fluentui/react';

export type OperationCardProps = {
  title: string;
  subtitle?: string;
  id: string;
  iconUrl: string;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationCard = (props: OperationCardProps) => {
  return (
    <div key={props.id} className="msla-operation-card">
      <div style={{ display: 'inline-block' }}>
        <Image className="msla-card-logo" src={props.iconUrl} alt={'logo for ' + props.title}></Image>
      </div>
      <div style={{ display: 'inline-block' }}>
        <Text variant="mediumPlus">{props.title}</Text>
      </div>
      <Text>
        {' '}
        style={{ display: 'inline' }}
        {props.subtitle}
      </Text>
    </div>
  );
};
