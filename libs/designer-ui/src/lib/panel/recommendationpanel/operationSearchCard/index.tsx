import { Avatar, Body1Strong, Caption1, Card } from '@fluentui/react-components';
import { ArrowFlowUpRightFilled } from '@fluentui/react-icons';
import { InfoDot } from '../../../infoDot';
import type { OperationActionData } from '../interfaces';
import { replaceWhiteSpaceWithUnderscore } from '@microsoft/logic-apps-shared';
import { OperationRuntimeBadges } from '../../../connectorsummarycard/operationRuntimeBadges';

export interface OperationSearchCardProps {
  operationActionData: OperationActionData;
  showConnectorName?: boolean;
  showImage?: boolean;
  onClick: (operationId: string, apiId?: string) => void;
}

export const OperationSearchCard: React.FC<OperationSearchCardProps> = (props) => {
  const { operationActionData, onClick, showConnectorName = false, showImage = false } = props;
  const { title, description, connectorName, isBuiltIn, isTrigger, brandColor = '#000', iconUri } = operationActionData;

  const onCardClick = () => {
    const apiId = operationActionData.apiId ?? '';
    onClick(operationActionData.id, apiId);
  };

  const buttonId = `msla-op-search-result-${replaceWhiteSpaceWithUnderscore(operationActionData.id)}`;

  return (
    <div className="msla-op-search-card-container">
      <Card
        id={buttonId}
        className="msla-op-search-card-container"
        onClick={() => onCardClick()}
        data-automation-id={buttonId}
        aria-label={title}
        focusMode="off"
      >
        <div className="msla-op-search-card-color-line" style={{ background: brandColor }} />
        {showImage && iconUri ? (
          <Avatar
            className="msla-op-search-card-image"
            icon={<ArrowFlowUpRightFilled style={{ color: brandColor }} />}
            image={{ src: iconUri }}
            role="presentation"
          />
        ) : null}
        <div className="msla-op-search-card-text">
          <Body1Strong
            className="msla-op-search-card-title"
            onKeyDown={(evt: React.KeyboardEvent<HTMLElement>) => {
              if (evt.key === 'Enter') {
                onCardClick();
              }
            }}
            tabIndex={0}
          >
            {title}
          </Body1Strong>
          {showConnectorName && connectorName ? (
            <span className="msla-op-search-card-subtitle">
              <Caption1>{connectorName}</Caption1>
            </span>
          ) : null}
        </div>
        <OperationRuntimeBadges isBuiltIn={isBuiltIn} isTrigger={isTrigger} />
        <InfoDot ariaDescribedBy={buttonId} description={description} innerAriaHidden="true" title={title} />
      </Card>
    </div>
  );
};
