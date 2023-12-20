import type { RootState } from '../../../core';
import { useAllConnectionErrors } from '../../../core/state/operation/operationSelector';
import { useAllSettingsValidationErrors } from '../../../core/state/setting/settingSelector';
import { useWorkflowParameterValidationErrors } from '../../../core/state/workflowparameters/workflowparametersselector';
import { NodeErrors } from './nodeErrors';
import { WorkflowParameterErrors } from './workflowParameterErrors';
import { FocusTrapZone, Text } from '@fluentui/react';
import { Button } from '@fluentui/react-components';
import { bundleIcon, Dismiss24Filled, Dismiss24Regular } from '@fluentui/react-icons';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

const CloseIcon = bundleIcon(Dismiss24Filled, Dismiss24Regular);

export const ErrorPanel = (props: CommonPanelProps) => {
  const intl = useIntl();

  /// Input Parameters

  const allInputErrors = useSelector((state: RootState): Record<string, string[]> => {
    const validationErrorToShow: Record<string, string[]> = {};
    for (const node of Object.entries(state.operations.inputParameters) ?? []) {
      const errors = Object.values(node[1].parameterGroups).flatMap((parameterGroup) =>
        Object.values(parameterGroup.parameters).flatMap((parameter) => parameter.validationErrors ?? [])
      );
      if (errors.length > 0) {
        validationErrorToShow[node[0]] = errors;
      }
    }
    return validationErrorToShow;
  });
  const numInputErrors = useMemo(() => {
    return Object.values(allInputErrors).reduce((acc, curr) => acc + curr.length, 0);
  }, [allInputErrors]);

  /// Settings

  const allRawSettingErrors = useAllSettingsValidationErrors();
  const allSettingErrors: Record<string, string[]> = useMemo(() => {
    const validationErrorToShow: Record<string, string[]> = {};
    for (const [nodeId, v] of Object.entries(allRawSettingErrors ?? {})) {
      const errors = v.map((setting) => setting.message ?? '');
      if (errors.length > 0) validationErrorToShow[nodeId] = errors;
    }
    return validationErrorToShow;
  }, [allRawSettingErrors]);

  const numSettingErrors = useMemo(() => {
    return Object.values(allSettingErrors).reduce((acc, curr) => acc + curr.length, 0);
  }, [allSettingErrors]);

  /// Connections

  const allConnectionErrors = useAllConnectionErrors();
  const numConnectionErrors = useMemo(() => Object.keys(allConnectionErrors ?? {}).length, [allConnectionErrors]);

  /// Workflow Parameters

  const workflowParameterNames: Record<string, string> = useSelector((state: RootState) =>
    Object.entries(state.workflowParameters.definitions).reduce((acc: any, curr: any) => {
      // eslint-disable-next-line no-param-reassign
      acc[curr[0]] = curr[1].name;
      return acc;
    }, {})
  );
  const workflowParameterErrors = useWorkflowParameterValidationErrors();
  const numWorkflowParameterErrors: number = useMemo(() => {
    return Object.values(workflowParameterErrors ?? {}).reduce((acc, curr) => acc + Object.keys(curr).length, 0);
  }, [workflowParameterErrors]);

  /// Aggregation

  const allNodesWithErrors = useMemo(
    () => [
      ...new Set([...Object.keys(allInputErrors ?? {}), ...Object.keys(allSettingErrors ?? {}), ...Object.keys(allConnectionErrors ?? {})]),
    ],
    [allConnectionErrors, allInputErrors, allSettingErrors]
  );

  const numOperationErrors = useMemo(
    () => numInputErrors + numSettingErrors + numConnectionErrors,
    [numInputErrors, numSettingErrors, numConnectionErrors]
  );

  const totalNumErrors = useMemo(() => numOperationErrors + numWorkflowParameterErrors, [numOperationErrors, numWorkflowParameterErrors]);

  /// INTL

  const errorPanelHeader = intl.formatMessage({
    defaultMessage: 'Errors',
    description: 'Header for the error panel',
  });

  const noErrorsText = intl.formatMessage({
    defaultMessage: 'No errors found.',
    description: 'Text to show when no errors exist',
  });

  const inputErrorsCategoryHeader = intl.formatMessage({
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

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{errorPanelHeader}</Text>
        <Button appearance="subtle" onClick={props.toggleCollapse} icon={<CloseIcon />} />
      </div>
      <div className="msla-error-panel-body">
        <ErrorCategory title={workflowParameterErrorsCategoryHeader} numErrors={numWorkflowParameterErrors}>
          <WorkflowParameterErrors parameterNames={workflowParameterNames} errors={workflowParameterErrors} />
        </ErrorCategory>

        <ErrorCategory title={inputErrorsCategoryHeader} numErrors={numOperationErrors}>
          {allNodesWithErrors.map((nodeId: string) => (
            <NodeErrors
              key={nodeId}
              nodeId={nodeId}
              errors={{
                [inputErrorsSubsectionHeader]: allInputErrors?.[nodeId],
                [settingErrorsSubsectionHeader]: allSettingErrors?.[nodeId],
                [connectionErrorsSubsectionHeader]: [allConnectionErrors?.[nodeId]],
              }}
            />
          ))}
        </ErrorCategory>

        {/* This shouldn't get hit since we disable the panel when there are no errors (but just in case) */}
        {totalNumErrors === 0 ? (
          <div className="msla-error-panel-no-errors">
            <Text variant="medium">{noErrorsText}</Text>
          </div>
        ) : null}
      </div>
    </FocusTrapZone>
  );
};

const ErrorCategory = (props: any) => {
  const { title, numErrors, children } = props;

  const [isExpanded, setIsExpanded] = useState(true);

  if (numErrors === 0) return null;

  return (
    <div className="msla-error-category-container">
      <div className="msla-error-category-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="msla-error-number-dot">{numErrors}</span>
        <span className="msla-error-category-title">{title}</span>
      </div>
      {isExpanded ? <div className="msla-error-category-body">{children}</div> : null}
    </div>
  );
};
