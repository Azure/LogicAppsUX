import { InfoDot } from '../../../infoDot';
import type { OperationActionData } from '../interfaces';
import { Text, Image } from '@fluentui/react';
import { useIntl } from 'react-intl';

export type OperationSearchCardProps = {
  operationActionData: OperationActionData;
  onClick: (operationId: string) => void;
  showImage?: boolean;
  style?: any;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationSearchCard = (props: OperationSearchCardProps) => {
  const { operationActionData, onClick, showImage = false, style } = props;
  const { title, description, category, isTrigger, brandColor = '#000', iconUri } = operationActionData;

  const intl = useIntl();
  return (
    <button className="msla-op-search-card-container" onClick={() => onClick(operationActionData.id)} style={style}>
      <div className="msla-op-search-card-color-line" style={{ background: brandColor }} />
      {showImage && iconUri ? <Image className="msla-op-search-card-image" alt={title} src={iconUri} /> : null}
      <Text className="msla-op-search-card-name">{title}</Text>

      {category ? <Text className="msla-psuedo-badge">{category}</Text> : null}
      {isTrigger ? (
        <Text className="msla-psuedo-badge">
          {intl.formatMessage({ defaultMessage: 'Trigger', description: 'Badge showing an action is a logic apps trigger' })}
        </Text>
      ) : (
        <Text className="msla-psuedo-badge">
          {intl.formatMessage({ defaultMessage: 'Action', description: 'Badge showing an action is a logic apps action' })}
        </Text>
      )}
      <InfoDot title={title} description={description} />
    </button>
  );
};
