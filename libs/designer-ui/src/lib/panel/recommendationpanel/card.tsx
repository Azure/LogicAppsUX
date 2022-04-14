import { Text } from '@fluentui/react';

export type OperationCardProps = {
  title: string;
  id: string;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationCard = (props: OperationCardProps) => {
  return (
    <div key={props.id} className="msla-operation-card">
      <Text>{props.title}</Text>
    </div>
  );
};
