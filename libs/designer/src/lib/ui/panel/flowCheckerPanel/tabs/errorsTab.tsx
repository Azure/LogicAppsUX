import type { RootState } from '../../../../core';
import { useAllConnectionErrors } from '../../../../core/state/operation/operationSelector';
import { useWorkflowParameterValidationErrors } from '../../../../core/state/workflowparameters/workflowparametersselector';
import { MessageCategory } from '../messageCategory';
import { NodeMessages } from '../nodeMessages';
import { WorkflowParameterErrors } from '../workflowParameterErrors';
import {
  useAllInputErrors,
  useAllSettingErrors,
  useNumOperationErrors,
  useNumWorkflowParameterErrors,
  useTotalNumErrors,
} from './errorsTab.hooks';
import { Text } from '@fluentui/react';
import type { NodeMessage } from '@microsoft/designer-ui';
import { MessageLevel } from '@microsoft/designer-ui';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const ErrorsTab = () => {
  const intl = useIntl();

  const noErrorsText = intl.formatMessage({
    defaultMessage: 'No errors found.',
    description: 'Text to show when no errors exist',
  });

  const operationErrorsCategoryHeader = intl.formatMessage({
    defaultMessage: 'Operation errors',
    description: 'Header for the input errors category',
  });

  const workflowParameterErrorsCategoryHeader = intl.formatMessage({
    defaultMessage: 'Workflow parameter errors',
    description: 'Header for the workflow parameter errors category',
  });

  const inputErrorsSubsectionHeader = intl.formatMessage({
    defaultMessage: 'Parameter errors',
    description: 'Header for the node parameter errors subsection',
  });

  const settingErrorsSubsectionHeader = intl.formatMessage({
    defaultMessage: 'Setting errors',
    description: 'Header for the setting errors subsection',
  });

  const connectionErrorsSubsectionHeader = intl.formatMessage({
    defaultMessage: 'Connection errors',
    description: 'Header for the connection errors subsection',
  });

  const numWorkflowParameterErrors = useNumWorkflowParameterErrors();
  const numOperationErrors = useNumOperationErrors();
  const totalNumErrors = useTotalNumErrors();
  const workflowParameterErrors = useWorkflowParameterValidationErrors();
  const allInputErrors = useAllInputErrors();
  const allSettingErrors = useAllSettingErrors();
  const allConnectionErrors = useAllConnectionErrors();

  const workflowParameterNames: Record<string, string> = useSelector((state: RootState) =>
    Object.entries(state.workflowParameters.definitions).reduce((acc: any, curr: any) => {
      // eslint-disable-next-line no-param-reassign
      acc[curr[0]] = curr[1].name;
      return acc;
    }, {})
  );

  const allNodesWithErrors = useMemo(
    () => [
      ...new Set([...Object.keys(allInputErrors ?? {}), ...Object.keys(allSettingErrors ?? {}), ...Object.keys(allConnectionErrors ?? {})]),
    ],
    [allConnectionErrors, allInputErrors, allSettingErrors]
  );

  const toNodeMessageFromString = (content: string): NodeMessage => {
    return {
      content,
    };
  };

  return (
    <div className="msla-flow-checker-panel-body">
      <MessageCategory title={workflowParameterErrorsCategoryHeader} level={MessageLevel.Error} numMessages={numWorkflowParameterErrors}>
        <WorkflowParameterErrors parameterNames={workflowParameterNames} errors={workflowParameterErrors} />
      </MessageCategory>

      <MessageCategory title={operationErrorsCategoryHeader} level={MessageLevel.Error} numMessages={numOperationErrors}>
        {allNodesWithErrors.map((nodeId: string) => (
          <NodeMessages
            key={nodeId}
            level={MessageLevel.Error}
            nodeId={nodeId}
            messagesBySubtitle={{
              [inputErrorsSubsectionHeader]: (allInputErrors?.[nodeId] || []).map(toNodeMessageFromString),
              [settingErrorsSubsectionHeader]: (allSettingErrors?.[nodeId] || []).map(toNodeMessageFromString),
              [connectionErrorsSubsectionHeader]: [allConnectionErrors?.[nodeId]].map(toNodeMessageFromString),
            }}
          />
        ))}
      </MessageCategory>

      {totalNumErrors === 0 ? (
        <div className="msla-flow-checker-panel-no-messages">
          <Text variant="medium">{noErrorsText}</Text>
        </div>
      ) : null}
    </div>
  );
};
