import { OperationGroupHeader } from './operationGroupHeader';
import { OperationGroupAction } from './opertationGroupAction';
import { Icon } from '@fluentui/react';
import type { OperationApi } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

export interface OperationGroupDetailsPageProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onClickOperation: (id: string) => void;
}

export interface OperationActionData {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Built-in' | 'Azure' | '';
  connectorName?: string;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { operationApi, operationActionsData, onClickOperation } = props;
  const { id, displayName, description, iconUri, brandColor } = operationApi;

  const firstCategory = operationActionsData[0].category;
  const isHybrid = operationActionsData.findIndex((action) => action.category !== firstCategory) !== -1;

  const HybridComponent = () => {
    const intl = useIntl();

    const hybridTitle = intl.formatMessage({
      defaultMessage: 'Hybrid Connector',
      description: 'Resource group title',
    });

    const hybridBody = intl.formatMessage({
      defaultMessage:
        'This connector has multiple implementations, use built-in for the best performance, or hosted for I don’t know some other reason.',
      description: 'Description about hybrid connectors',
    });

    return (
      <div className="msla-hybrid-info-container">
        <Icon style={{ fontSize: '20px' }} iconName={'Puzzle'} />
        <div className="msla-hybrid-text-container">
          <span className={'msla-op-group-heading-text'}>{hybridTitle}</span>
          <span className={'msla-op-group-subheading-text'}>{hybridBody}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="msla-op-group-detail-page">
      <OperationGroupHeader id={id} title={displayName} description={description} iconUrl={iconUri} />
      {isHybrid ? <HybridComponent /> : null}
      <div className="msla-op-group-item-container">
        {operationActionsData?.map((op) => (
          <OperationGroupAction
            key={op.id}
            id={op.id}
            title={op.title}
            subtitle={op.subtitle}
            brandColor={brandColor}
            category={op.category}
            onClick={onClickOperation}
            connectorName={op.connectorName}
          />
        ))}
      </div>
    </div>
  );
};
