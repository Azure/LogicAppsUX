import { InfoDot } from '../../../infoDot';
import { convertUIElementNameToAutomationId, getPreviewTag } from '../../../utils';
import type { OperationActionData } from '../interfaces';
import { Text, Image } from '@fluentui/react';
import { useIntl } from 'react-intl';

export type OperationSearchCardProps = {
  operationActionData: OperationActionData;
  onClick: (operationId: string, apiId?: string) => void;
  displayRuntimeInfo: boolean;
  showImage?: boolean;
  style?: any;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationSearchCard = (props: OperationSearchCardProps) => {
  const { operationActionData, onClick, showImage = false, style, displayRuntimeInfo } = props;
  const { title, description, category, isBuiltIn, isTrigger, brandColor = '#000', iconUri, releaseStatus } = operationActionData;

  const intl = useIntl();
  const previewTag = getPreviewTag(releaseStatus);

  const triggerBadgeText = intl.formatMessage({
    defaultMessage: 'Trigger',
    description: 'Badge showing an action is a logic apps trigger',
  });

  const onCardClick = () => {
    const apiId = operationActionData.apiId ?? '';
    onClick(operationActionData.id, apiId);
  };

  return (
    <button
      className="msla-op-search-card-container"
      onClick={() => onCardClick()}
      style={style}
      data-automation-id={`msla-op-search-result-${convertUIElementNameToAutomationId(title)}`}
    >
      <div className="msla-op-search-card-color-line" style={{ background: brandColor }} />
      {showImage && iconUri ? <Image className="msla-op-search-card-image" alt={title} src={iconUri} /> : null}
      <Text className="msla-op-search-card-name">{title}</Text>
      {displayRuntimeInfo && previewTag ? <Text className="msla-psuedo-badge">{previewTag}</Text> : null}
      {displayRuntimeInfo && isBuiltIn && category ? <Text className="msla-psuedo-badge">{category}</Text> : null}
      {displayRuntimeInfo && isTrigger ? <Text className="msla-psuedo-badge">{triggerBadgeText}</Text> : null}
      <InfoDot description={description} />
    </button>
  );
};
