import { Button } from '@fluentui/react-components';
import { BrowseGrid } from '../browseResults';
import type { OperationActionData } from '../interfaces';
import { useIntl } from 'react-intl';
import type { OperationApi } from '@microsoft/logic-apps-shared';
import { OperationGroupHeaderNew } from './operationGroupHeader';
import { useOperationSearchGroupStyles } from './operationSearchGroup.styles';

export interface OperationSearchGroupProps {
  operationApi: OperationApi;
  operationActionsData: OperationActionData[];
  onConnectorClick: (connectorId: string) => void;
  onOperationClick: (operationId: string) => void;
  showConnectorName?: boolean;
  maxOperationsToDisplay: number;
}

export const OperationSearchGroup = ({
  operationApi,
  operationActionsData,
  onConnectorClick,
  onOperationClick,
  maxOperationsToDisplay,
}: OperationSearchGroupProps) => {
  const { id } = operationApi;
  const intl = useIntl();
  const styles = useOperationSearchGroupStyles();

  const seeMoreText = intl.formatMessage({
    defaultMessage: 'See more',
    id: '0aREuu',
    description: 'Text to select for more connector information',
  });

  const viewConnectorText = intl.formatMessage({
    defaultMessage: 'See connector',
    id: '7hqkG9',
    description: 'Text to select to view connector operations',
  });

  return (
    <div style={{ position: 'relative' }}>
      <div className={styles.header}>
        <OperationGroupHeaderNew connector={operationApi} onConnectorClick={onConnectorClick} />
        <Button
          className={styles.seeMoreButton}
          style={{ padding: 0, justifyContent: 'flex-end' }}
          appearance="transparent"
          onClick={() => onConnectorClick(id)}
        >
          {operationActionsData.length > maxOperationsToDisplay ? seeMoreText : viewConnectorText}
        </Button>
      </div>
      <BrowseGrid
        // Loading spinner is shown at top of search results view, so avoid showing it again for each operation group
        isLoading={false}
        operationsData={operationActionsData.slice(0, maxOperationsToDisplay)}
        onOperationSelected={onOperationClick}
        displayRuntimeInfo={false}
      />
    </div>
  );
};
