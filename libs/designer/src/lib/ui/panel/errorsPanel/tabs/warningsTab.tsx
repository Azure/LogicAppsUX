import { ErrorCategory } from '../errorCategory';
import { NodeErrors } from '../nodeErrors';
import { useHostCheckerWarnings, useTotalNumWarnings } from './warningsTab.hooks';
import { Text } from '@fluentui/react';
import { MessageLevel } from '@microsoft/designer-ui';
import { getRecordEntry } from '@microsoft/utils-logic-apps';
import { useIntl } from 'react-intl';

export const WarningsTab = () => {
  const intl = useIntl();

  const operationWarningsCategoryHeader = intl.formatMessage({
    defaultMessage: 'Operation warnings',
    description: 'Header for the operation warnings category',
  });

  const noWarningsText = intl.formatMessage({
    defaultMessage: 'No warnings found.',
    description: 'Text to show when no warnings exist',
  });

  const hostCheckerWarnings = useHostCheckerWarnings();

  const allNodesWithWarnings = Object.keys(hostCheckerWarnings);
  const totalNumWarnings = useTotalNumWarnings();

  return (
    <div className="msla-error-panel-body">
      <ErrorCategory title={operationWarningsCategoryHeader} level={MessageLevel.Warning} numMessages={totalNumWarnings}>
        {allNodesWithWarnings.map((nodeId) => (
          <NodeErrors
            key={nodeId}
            level={MessageLevel.Warning}
            nodeId={nodeId}
            messagesBySubtitle={{ ...getRecordEntry(hostCheckerWarnings, nodeId) }}
          />
        ))}
      </ErrorCategory>

      {totalNumWarnings === 0 ? (
        <div className="msla-error-panel-no-messages">
          <Text variant="medium">{noWarningsText}</Text>
        </div>
      ) : null}
    </div>
  );
};
