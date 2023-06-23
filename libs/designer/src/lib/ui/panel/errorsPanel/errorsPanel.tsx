import type { RootState } from '../../../core';
import { useWorkflowParameterValidationErrors } from '../../../core/state/workflowparameters/workflowparametersselector';
import { NodeErrors } from './nodeErrors';
import { WorkflowParameterErrors } from './workflowParameterErrors';
import { FocusTrapZone, IconButton, Text, css } from '@fluentui/react';
// import { useWorkflowParameterValidationErrors } from '../../../core/state/workflowparameters/workflowparametersselector';
import type { CommonPanelProps } from '@microsoft/designer-ui';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export const ErrorPanel = (props: CommonPanelProps) => {
  const intl = useIntl();

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

  const workflowParameterNames: Record<string, string> = useSelector((state: RootState) =>
    Object.entries(state.workflowParameters.definitions).reduce((acc: any, curr: any) => {
      // eslint-disable-next-line no-param-reassign
      acc[curr[0]] = curr[1].name;
      return acc;
    }, {})
  );
  const workflowParametersErrors = useWorkflowParameterValidationErrors();
  const numWorkflowParametersErrors: number = useMemo(() => {
    return Object.values(workflowParametersErrors ?? {}).reduce((acc, curr) => acc + Object.keys(curr).length, 0);
  }, [workflowParametersErrors]);

  const totalNumErrors = useMemo(() => numInputErrors + numWorkflowParametersErrors, [numInputErrors, numWorkflowParametersErrors]);

  const errorPanelHeader = intl.formatMessage({
    defaultMessage: 'Errors',
    description: 'Header for the error panel',
  });

  const noErrorsText = intl.formatMessage({
    defaultMessage: 'No errors found :-)',
    description: 'Text to display when there are no errors',
  });

  const inputErrorsCategoryHeader = intl.formatMessage({
    defaultMessage: 'Operation Errors',
    description: 'Header for the input errors category',
  });

  const workflowParametersCategoryHeader = intl.formatMessage({
    defaultMessage: 'Workflow Parameters Errors',
    description: 'Header for the workflow parameters errors category',
  });

  return (
    <FocusTrapZone>
      <div className="msla-app-action-header">
        <Text variant="xLarge">{errorPanelHeader}</Text>
        <IconButton onClick={props.toggleCollapse} iconProps={{ iconName: 'Cancel' }} />
      </div>
      <div className="msla-error-panel-body">
        <ErrorCategory title={workflowParametersCategoryHeader} numErrors={numWorkflowParametersErrors}>
          {numWorkflowParametersErrors > 0 ? (
            <WorkflowParameterErrors parameterNames={workflowParameterNames} errors={workflowParametersErrors} />
          ) : null}
        </ErrorCategory>

        <ErrorCategory title={inputErrorsCategoryHeader} numErrors={numInputErrors}>
          {Object.entries(allInputErrors).map(([nodeId, errors]: any) => (
            <NodeErrors key={nodeId} nodeId={nodeId} inputErrors={errors} />
          ))}
        </ErrorCategory>

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

  return (
    <div className={css('msla-error-category-container', numErrors === 0 && 'disabled')}>
      <div className="msla-error-category-header" onClick={() => setIsExpanded(!isExpanded)}>
        <span className="msla-error-number-dot">{numErrors}</span>
        <span className="msla-error-category-title">{title}</span>
      </div>
      {isExpanded || numErrors === 0 ? <div className="msla-error-category-body">{children}</div> : null}
    </div>
  );
};
