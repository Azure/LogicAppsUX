import { InfoDot } from '../../../infoDot';
import { getPreviewTag } from '../../../utils';
import type { OperationActionData } from '../interfaces';
import { Image } from '@fluentui/react';
import { Badge, Text } from '@fluentui/react-components';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export type OperationSearchCardProps = {
  operationActionData: OperationActionData;
  displayRuntimeInfo: boolean;
  showImage?: boolean;
  style?: any;
  onClick: (operationId: string, apiId?: string) => void;
} & CommonCardProps;

export interface CommonCardProps {
  brandColor?: string;
}

export const OperationSearchCard = (props: OperationSearchCardProps) => {
  const { operationActionData, onClick, showImage = false, style, displayRuntimeInfo } = props;
  const {
    title,
    description,
    category,
    isBuiltIn,
    isPremium,
    isTrigger,
    brandColor = '#000',
    iconUri,
    releaseStatus,
  } = operationActionData;

  const intl = useIntl();
  const previewTag = getPreviewTag(releaseStatus);

  const triggerBadgeText = intl.formatMessage({
    defaultMessage: 'Trigger',
    id: '02vyBk',
    description: 'Badge showing an action is a logic apps trigger',
  });

  const onCardClick = () => {
    const apiId = operationActionData.apiId ?? '';
    onClick(operationActionData.id, apiId);
  };

  const buttonId = `msla-op-search-result-${replaceWhiteSpaceWithUnderscore(operationActionData.id)}`;

  return (
    <button
      id={buttonId}
      className="msla-op-search-card-container"
      onClick={() => onCardClick()}
      style={style}
      data-automation-id={`msla-op-search-result-${replaceWhiteSpaceWithUnderscore(operationActionData.id)}`}
      aria-label={title}
    >
      <div className="msla-op-search-card-color-line" style={{ background: brandColor }} />
      {showImage && iconUri ? <Image className="msla-op-search-card-image" alt={title} src={iconUri} /> : null}
      <Text className="msla-op-search-card-name">{title}</Text>
      {displayRuntimeInfo && (
        <>
          {previewTag ? (
            <Badge appearance="outline" shape="rounded">
              {previewTag}
            </Badge>
          ) : null}
          {isBuiltIn && category ? (
            <Badge appearance="outline" shape="rounded">
              {category}
            </Badge>
          ) : isPremium && category ? (
            <Badge color="success" appearance="outline" shape="square">
              {category}
            </Badge>
          ) : null}
          {isTrigger ? (
            <Badge appearance="outline" shape="rounded">
              {triggerBadgeText}
            </Badge>
          ) : null}
        </>
      )}

      <InfoDot ariaDescribedBy={buttonId} description={description} innerAriaHidden="true" />
    </button>
  );
};
