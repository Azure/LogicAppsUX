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
      <Image src={props.iconUrl} alt={'logo for ' + props.title}></Image>
      <Text>{props.title}</Text>
      <Text>{props.subtitle}</Text>
    </div>
  );
};
