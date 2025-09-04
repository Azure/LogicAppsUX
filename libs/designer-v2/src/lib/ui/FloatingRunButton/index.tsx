import { useCallback, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, SplitButton } from '@fluentui/react-components';

import { bundleIcon, FlashFilled, FlashRegular, FlashSettingsFilled, FlashSettingsRegular } from '@fluentui/react-icons';
import { canRunBeInvokedWithPayload, isNullOrEmpty, RunService, WorkflowService } from '@microsoft/logic-apps-shared';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCustomCodeFilesWithData,
  resetDesignerDirtyState,
  store,
  updateParameterValidation,
  validateParameter,
  type RootState,
} from '../../core';
import { serializeBJSWorkflow } from '../..';

const RunIcon = bundleIcon(FlashFilled, FlashRegular);
const RunWithPayloadIcon = bundleIcon(FlashSettingsFilled, FlashSettingsRegular);

export const FloatingRunButton = ({ id: _id, saveDraftWorkflow, onRun }: any) => {
  const intl = useIntl();

  const dispatch = useDispatch();

  const operationState = useSelector((state: RootState) => state.operations);

  const canBeRunWithPayload = useMemo(() => canRunBeInvokedWithPayload(operationState?.operationInfo), [operationState?.operationInfo]);

  const saveWorkflow = useCallback(async () => {
    try {
      const designerState = store.getState();
      const serializedWorkflow = await serializeBJSWorkflow(designerState, {
        skipValidation: false,
        ignoreNonCriticalErrors: true,
      });
      const customCodeData = getCustomCodeFilesWithData(designerState.customCode);

      const validationErrorsList: Record<string, boolean> = {};
      const arr = Object.entries(designerState.operations.inputParameters);
      for (const [id, nodeInputs] of arr) {
        const hasValidationErrors = Object.values(nodeInputs.parameterGroups).some((parameterGroup) => {
          return parameterGroup.parameters.some((parameter) => {
            const validationErrors = validateParameter(parameter, parameter.value);
            if (validationErrors.length > 0) {
              dispatch(updateParameterValidation({ nodeId: id, groupId: parameterGroup.id, parameterId: parameter.id, validationErrors }));
            }
            return validationErrors.length;
          });
        });
        if (hasValidationErrors) {
          validationErrorsList[id] = hasValidationErrors;
        }
      }

      const hasParametersErrors = !isNullOrEmpty(validationErrorsList);

      if (!hasParametersErrors) {
        return saveDraftWorkflow(serializedWorkflow, customCodeData as any, () => dispatch(resetDesignerDirtyState(undefined) as any));
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error);
    }
  }, [dispatch, saveDraftWorkflow]);

  const {
    mutate: runMutate,
    isLoading: runIsLoading,
    // error: runError,
  } = useMutation(async () => {
    try {
      const saveResponse = await saveWorkflow();
      const triggerId = Object.keys(saveResponse?.definition?.triggers || {})?.[0];
      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      const method = saveResponse?.definition?.triggers?.[triggerId]?.inputs?.method || 'POST';
      callbackInfo.method = method;
      const runResponse = await RunService().runTrigger(callbackInfo);
      const runId = runResponse?.headers?.['x-ms-workflow-run-id'];
      onRun(runId);
    } catch (error: any) {
      console.error('Error running:', error);
    }
  });

  const {
    mutate: runWithPayloadMutate,
    isLoading: runWithPayloadIsLoading,
    // error: runWithPayloadError,
  } = useMutation(async () => {
    try {
      const saveResponse = await saveWorkflow();
      const triggerId = Object.keys(saveResponse?.definition?.triggers || {})?.[0];
      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      const method = saveResponse?.definition?.triggers?.[triggerId]?.inputs?.method || 'POST';
      callbackInfo.method = method;
      const runWithPayloadResponse = await RunService().runTrigger(callbackInfo);
      const runId = runWithPayloadResponse?.headers?.['x-ms-workflow-run-id'];
      onRun(runId);
    } catch (error: any) {
      console.error('Error running with payload:', error);
    }
  });

  const buttonCommonProps: any = {
    appearance: 'primary',
    shape: 'circular',
    size: 'large',
    disabled: runIsLoading || runWithPayloadIsLoading,
    style: {
      position: 'absolute',
      bottom: '16px',
      left: '50%',
      transform: 'translate(-50%, 0)',
    },
  };

  const runText = intl.formatMessage({
    defaultMessage: 'Run',
    id: 'd8JU5h',
    description: 'Run button text',
  });

  if (canBeRunWithPayload) {
    return (
      <SplitButton
        {...buttonCommonProps}
        primaryActionButton={{
          icon: <RunIcon />,
          onClick: runMutate,
        }}
        menuButton={
          canBeRunWithPayload
            ? {
                icon: <RunWithPayloadIcon />,
                onClick: runWithPayloadMutate,
              }
            : undefined
        }
      >
        {runText}
      </SplitButton>
    );
  }

  return (
    <Button {...buttonCommonProps} icon={<RunIcon />} onClick={runMutate}>
      {runText}
    </Button>
  );
};
