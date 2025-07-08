import { getPreviewTag } from '../../../utils';
import type { OperationActionData, OperationGroupCardData } from '../interfaces';
import { Badge, Caption1, Card, mergeClasses, Text } from '@fluentui/react-components';
import { InfoDot } from '../../../infoDot';
import { ChevronRight12Regular } from '@fluentui/react-icons';
import { ConnectorAvatar } from '../connectorAvatar';
import { FavoriteButton } from '../favoriteButton';

export interface OperationsData {
  type: 'Operation';
  data: OperationActionData;
}

export interface OperationGroupData {
  type: 'OperationGroup';
  data: OperationGroupCardData;
}

export interface BaseRecommendationPanelCardProps {
  onConnectorClick?: (id: string) => void;
  onOperationClick?: (operationId: string, apiId?: string) => void;
  showConnectorName?: boolean;
  showFilledFavoriteOnlyOnHover?: boolean;
  showUnfilledFavoriteOnlyOnHover?: boolean;
  hideFavorites?: boolean;
}

export type RecommendationPanelCardProps = BaseRecommendationPanelCardProps & {
  operationData: OperationsData | OperationGroupData;
};

export const RecommendationPanelCard = ({
  operationData,
  onConnectorClick,
  onOperationClick,
  showFilledFavoriteOnlyOnHover,
  showUnfilledFavoriteOnlyOnHover,
  showConnectorName,
  hideFavorites = false,
}: RecommendationPanelCardProps) => {
  const { data } = operationData;
  const { apiId = '', connectorName, description, iconUri, brandColor, isCustom } = data;

  const isOperationAction = isOperationData(operationData);
  const operationTitle = isOperationAction ? operationData.data.title : (connectorName ?? '');
  const previewTag = isOperationAction ? getPreviewTag(operationData.data.releaseStatus) : undefined;

  const handleClick = () => {
    if (isOperationAction) {
      onOperationClick?.(operationData.data.id, operationData.data.apiId);
    } else {
      onConnectorClick?.(apiId);
    }
  };

  return (
    <Card
      className="msla-recommendation-panel-card"
      focusMode="off"
      onClick={handleClick}
      tabIndex={0}
      aria-label={operationTitle}
      data-automation-id={apiId}
      style={{ flexDirection: 'row' }}
      title={operationTitle}
    >
      <div className="msla-recommendation-panel-card-image">
        <ConnectorAvatar
          className="msla-recommendation-panel-card-connector-image"
          displayName={connectorName ?? ''}
          isCustomApi={isCustom}
          id={apiId}
          iconUri={iconUri ?? ''}
          brandColor={brandColor}
          size={24}
        />
      </div>

      <div className="msla-recommendation-panel-card-text">
        <div className="msla-recommendation-panel-card-horizontal-flex-items">
          <Text className="msla-recommendation-panel-card-title">{operationTitle}</Text>
          {previewTag ? (
            <Badge appearance="tint" shape="circular" color="informative" size="medium">
              {previewTag}
            </Badge>
          ) : null}
        </div>

        {showConnectorName && connectorName && <Caption1 className="msla-recommendation-panel-card-subtitle">{connectorName}</Caption1>}
      </div>

      <div className="msla-recommendation-panel-card-horizontal-flex-items">
        <InfoDot
          className={mergeClasses('msla-recommendation-panel-card-visible-on-hover', 'info-dot-visible-on-hover')}
          title={operationTitle}
          description={description}
          innerAriaHidden="true"
        />
        {hideFavorites ? null : (
          <FavoriteButton
            connectorId={apiId}
            operationId={isOperationAction ? operationData.data.id : undefined}
            showFilledFavoriteOnlyOnHover={showFilledFavoriteOnlyOnHover}
            showUnfilledFavoriteOnlyOnHover={showUnfilledFavoriteOnlyOnHover}
          />
        )}
        {isOperationAction ? null : <ChevronRight12Regular />}
      </div>
    </Card>
  );
};

function isOperationData(operationData: OperationsData | OperationGroupData): operationData is OperationsData {
  return operationData.type === 'Operation';
}
