import { InfoDot } from '../../../infoDot';
import type { OperationActionData } from '../interfaces';
import { Text, Image } from '@fluentui/react';
import { useCallback } from 'react';

export type OperationSearchCardProps = {
  operationActionData: OperationActionData;
  onClick: (id: string) => void;
  showImage?: boolean;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationSearchCard = (props: OperationSearchCardProps) => {
  const { onClick, showImage = false } = props;
  const { id, title, description, category, brandColor = '#000', iconUri } = props.operationActionData;

  const handleClick = useCallback(() => onClick(id), [id, onClick]);

  return (
    <button className="msla-op-search-card-container" onClick={handleClick}>
      <div className="msla-op-search-card-color-line" style={{ background: brandColor }} />
      {showImage && iconUri ? <Image className="msla-op-search-card-image" alt={title} src={iconUri} /> : null}
      <Text className="msla-op-search-card-name">{title}</Text>

      {category ? <Text className="msla-psuedo-badge">{category}</Text> : null}

      <InfoDot title={title} description={description} />
    </button>
  );
};
