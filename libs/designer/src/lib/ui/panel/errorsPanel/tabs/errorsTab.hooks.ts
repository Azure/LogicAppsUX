import type { RootState } from '../../../../core';
import { useAllConnectionErrors } from '../../../../core/state/operation/operationSelector';
import { useAllSettingsValidationErrors } from '../../../../core/state/setting/settingSelector';
import type { ErrorMessage } from '../../../../core/state/workflow/workflowInterfaces';
import { useWorkflowParameterValidationErrors } from '../../../../core/state/workflowparameters/workflowparametersselector';
import { MessageLevel } from '@microsoft/logic-apps-shared';
import { useMemo } from 'react';
import { useSelector } from 'react-redux';

/// Input Parameters

export const useAllInputErrors = () =>
  useSelector((state: RootState): Record<string, string[]> => {
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

const useNumInputErrors = () => {
  const allInputErrors = useAllInputErrors();
  return useMemo(() => {
    return Object.values(allInputErrors).reduce((acc, curr) => acc + curr.length, 0);
  }, [allInputErrors]);
};

/// Settings

export const useAllSettingErrors = () => {
  const allRawSettingErrors = useAllSettingsValidationErrors();
  return useMemo(() => {
    const validationErrorToShow: Record<string, string[]> = {};
    for (const [nodeId, v] of Object.entries(allRawSettingErrors ?? {})) {
      const errors = v.map((setting) => setting.message ?? '');
      if (errors.length > 0) validationErrorToShow[nodeId] = errors;
    }
    return validationErrorToShow;
  }, [allRawSettingErrors]);
};

const useNumSettingErrors = () => {
  const allSettingErrors = useAllSettingErrors();
  return useMemo(() => {
    return Object.values(allSettingErrors).reduce((acc, curr) => acc + curr.length, 0);
  }, [allSettingErrors]);
};

/// Connections

const useNumConnectionErrors = () => {
  const allConnectionErrors = useAllConnectionErrors();
  return useMemo(() => Object.keys(allConnectionErrors ?? {}).length, [allConnectionErrors]);
};

/// Workflow Parameters

export const useNumWorkflowParameterErrors = () => {
  const workflowParameterErrors = useWorkflowParameterValidationErrors();
  return useMemo(() => {
    return Object.values(workflowParameterErrors ?? {}).reduce((acc, curr) => acc + Object.keys(curr).length, 0);
  }, [workflowParameterErrors]);
};

// Custom errors from host

export const useHostCheckerErrors = () =>
  useSelector((state: RootState): Record<string, Record<string, ErrorMessage[]>> => {
    const errorMessagesToShow: Record<string, Record<string, ErrorMessage[]>> = {};

    const errorMessages = state.workflow.hostData.errorMessages[MessageLevel.Error] || [];
    errorMessages.forEach((message: ErrorMessage) => {
      // Check if a node with matching id at least exists
      if (!(message.nodeId in state.workflow.nodesMetadata)) return;

      const messagesBySubtitle = (errorMessagesToShow[message.nodeId] ||= {});
      (messagesBySubtitle[message.subtitle] ||= []).push(message);
    });
    return errorMessagesToShow;
  });

const useNumHostCheckerErrors = () => {
  const hostCheckerErrors = useHostCheckerErrors();
  return useMemo(() => {
    return Object.values(hostCheckerErrors).reduce((acc, curr) => {
      return acc + Object.values(curr).reduce((acc2, curr2) => acc2 + curr2.length, 0);
    }, 0);
  }, [hostCheckerErrors]);
};

/// Aggregation

export const useNumOperationErrors = () => {
  const numInputErrors = useNumInputErrors();
  const numSettingErrors = useNumSettingErrors();
  const numConnectionErrors = useNumConnectionErrors();
  const numHostCheckerErrors = useNumHostCheckerErrors();
  return useMemo(
    () => numInputErrors + numSettingErrors + numConnectionErrors + numHostCheckerErrors,
    [numInputErrors, numSettingErrors, numConnectionErrors, numHostCheckerErrors]
  );
};

export const useTotalNumErrors = () => {
  const numOperationErrors = useNumOperationErrors();
  const numWorkflowParameterErrors = useNumWorkflowParameterErrors();
  return useMemo(() => numOperationErrors + numWorkflowParameterErrors, [numOperationErrors, numWorkflowParameterErrors]);
};
