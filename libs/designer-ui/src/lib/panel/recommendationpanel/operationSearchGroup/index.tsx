import { ConnectorSummaryCard } from '../../../connectorsummarycard';
import { getConnectorCategoryString } from '../../../utils';
import type { OperationActionData } from '../interfaces';
import { OperationSearchCard } from '../operationSearchCard';
import { Link } from '@fluentui/react';
import type { OperationApi } from '@microsoft/logic-apps-shared';
import { useIntl } from 'react-intl';

export interface OperationSearchGroupProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string) => void;
  displayRuntimeInfo: boolean;
}

export const OperationSearchGroup = (props: OperationSearchGroupProps) => {
  const { operationApi, operationActionsData, onConnectorClick, onOperationClick, displayRuntimeInfo } = props;
  const { id } = operationApi;

  const intl = useIntl();

  const category = getConnectorCategoryString(id);

  const seeMoreText = intl.formatMessage({
    defaultMessage: 'See more',
    description: 'Text that will be clicked to show more details for the connector',
  });

  return (
    <div style={{ position: 'relative' }}>
      <ConnectorSummaryCard connector={operationApi} category={category} isCard={false} displayRuntimeInfo={displayRuntimeInfo} />
      <Link className="msla-op-search-group-see-more" onClick={() => onConnectorClick(id)}>
        {seeMoreText}
      </Link>
      <div className="msla-op-search-group">
        {operationActionsData?.slice(0, 3).map((op /* Only show 3 operations per group */) => (
          <OperationSearchCard key={op?.id} operationActionData={op} onClick={onOperationClick} displayRuntimeInfo={displayRuntimeInfo} />
        ))}
      </div>
    </div>
  );
};
