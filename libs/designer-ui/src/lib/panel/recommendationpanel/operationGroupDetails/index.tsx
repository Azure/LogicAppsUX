import { useMemo } from 'react';
import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import HybridNotice from './HybridNotice';
import { OperationGroupHeader } from './operationGroupHeader';
import { MessageBar, MessageBarType } from '@fluentui/react';
import { Spinner } from '@fluentui/react-components';
import { isNullOrUndefined, type Connector } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface OperationGroupDetailsPageProps {
  connector?: Connector;
  operationActionsData: OperationActionData[];
  onOperationClick: (id: string, apiId?: string) => void;
  isLoading: boolean;
  displayRuntimeInfo: boolean;
  addAsConnector?: (connector?: Connector, actionData?: OperationActionData[]) => void;
}

export const OperationGroupDetailsPage: React.FC<OperationGroupDetailsPageProps> = (props) => {
  const { connector, operationActionsData, onOperationClick, isLoading, displayRuntimeInfo } = props;
  const { id = '', properties } = connector ?? {};
  const {
    displayName = '',
    description,
    iconUri = '',
    externalDocs,
    generalInformation,
    // brandColor: connectorBrandColor,
  } = properties ?? {};
  // const brandColor = connectorBrandColor ?? operationActionsData.find((action) => action.brandColor)?.brandColor;

  const intl = useIntl();

  const { category } = operationActionsData?.[0] ?? {};
  const isHybrid = operationActionsData.findIndex((action) => action.category !== category) !== -1;
  const isLoadingConnector = isNullOrUndefined(connector);

  const sortedOperations = useMemo(() => operationActionsData.sort((a, b) => a.title.localeCompare(b.title)), [operationActionsData]);

  const noOperationsText = intl.formatMessage({
    defaultMessage: 'No operations found',
    id: 'Sr8PcK',
    description: 'Message to show when no operations are found',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading...',
    id: '5ytHcK',
    description: 'Loading text for spinner',
  });

  // const addAsConnectorText = intl.formatMessage({
  //   defaultMessage: 'Add as connector',
  //   id: 'Du5IWc',
  //   description: 'Add as connector button text',
  // });

  // const textColor = getContrastTextColor(brandColor);

  return (
    <div className="msla-op-group-detail-page">
      {isLoadingConnector ? null : (
        <OperationGroupHeader
          id={id}
          title={displayName}
          description={description ?? generalInformation?.description}
          iconUrl={iconUri}
          docsUrl={externalDocs?.url}
        />
      )}
      {isHybrid ? <HybridNotice /> : null}
      {/* {addAsConnector ? (
        <Button
          className="msla-op-group-connector-add-button"
          style={{ backgroundColor: brandColor, color: textColor }}
          onClick={() => addAsConnector(connector, sortedOperations)}
        >
          {addAsConnectorText}
        </Button>
      ) : null} */}
      <ul className="msla-op-group-item-container" aria-label={`Operation list for ${displayName} Connector`}>
        {!isLoading && operationActionsData.length === 0 ? (
          <MessageBar messageBarType={MessageBarType.info}>{noOperationsText}</MessageBar>
        ) : null}
        {isLoadingConnector
          ? null
          : sortedOperations?.map((op) => (
              <li key={op.id}>
                <OperationSearchCard operationActionData={op} onClick={onOperationClick} displayRuntimeInfo={displayRuntimeInfo} />
              </li>
            ))}
        {isLoading || isLoadingConnector ? (
          <div style={{ margin: '16px 0' }}>
            <Spinner size="tiny" label={loadingText} aria-live="assertive" />
          </div>
        ) : null}
      </ul>
    </div>
  );
};
