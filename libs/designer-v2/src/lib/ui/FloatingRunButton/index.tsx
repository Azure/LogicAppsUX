import { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Spinner, SplitButton } from '@fluentui/react-components';
import { bundleIcon, FlashFilled, FlashRegular, FlashSettingsFilled, FlashSettingsRegular } from '@fluentui/react-icons';
import type { Workflow } from '@microsoft/logic-apps-shared';
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
import { PayloadPopover } from './payloadPopover';
import { useIsA2AWorkflow } from '../../core/state/designerView/designerViewSelectors';
import { ChatButton } from './chat';

const RunIcon = bundleIcon(FlashFilled, FlashRegular);
const RunWithPayloadIcon = bundleIcon(FlashSettingsFilled, FlashSettingsRegular);

export interface FloatingRunButtonProps {
  id?: string;
  saveDraftWorkflow: (workflowDefinition: Workflow, customCodeData: any, onSuccess: () => void) => Promise<any>;
  onRun?: (runId: string) => void;
  isDarkMode: boolean;
  isDraftMode?: boolean;
}

export const FloatingRunButton = ({ id: _id, saveDraftWorkflow, onRun, isDarkMode, isDraftMode }: FloatingRunButtonProps) => {
  const intl = useIntl();

  const dispatch = useDispatch();

  const isA2AWorkflow = useIsA2AWorkflow();

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
      if (!triggerId) {
        return;
      }
      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      const method = saveResponse?.definition?.triggers?.[triggerId]?.inputs?.method || 'POST';
      callbackInfo.method = method;
      // Wait 0.5 seconds, running too fast after saving causes 500 error
      await new Promise((resolve) => setTimeout(resolve, 500));
      const runResponse = await RunService().runTrigger(callbackInfo, undefined, isDraftMode);
      const runId = runResponse?.responseHeaders?.['x-ms-workflow-run-id'] ?? runResponse?.headers?.['x-ms-workflow-run-id'];
      onRun?.(runId);
    } catch (_error: any) {
      return;
    }
  });

  const {
    mutate: runWithPayloadMutate,
    isLoading: runWithPayloadIsLoading,
    // error: runWithPayloadError,
  } = useMutation(async (payload: any) => {
    try {
      const saveResponse = await saveWorkflow();
      const triggerId = Object.keys(saveResponse?.definition?.triggers || {})?.[0];
      if (!triggerId) {
        return;
      }
      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      callbackInfo.method = payload?.method;
      // Wait 0.5 seconds, running too fast after saving causes 500 error
      await new Promise((resolve) => setTimeout(resolve, 500));
      const runWithPayloadResponse = await RunService().runTrigger(callbackInfo, payload);
      const runId = runWithPayloadResponse?.headers?.['x-ms-workflow-run-id'];
      onRun?.(runId);
    } catch (_error: any) {
      return;
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

  const buttonRef = useRef(null);

  const [popoverOpen, setPopoverOpen] = useState(false);

  if (canBeRunWithPayload) {
    return (
      <>
        <SplitButton
          {...buttonCommonProps}
          primaryActionButton={{
            icon: runIsLoading ? <Spinner size="tiny" /> : <RunIcon />,
            onClick: runMutate,
          }}
          menuButton={
            canBeRunWithPayload
              ? {
                  icon: runWithPayloadIsLoading ? <Spinner size="tiny" /> : <RunWithPayloadIcon />,
                  onClick: () => setPopoverOpen(true),
                  ref: buttonRef,
                }
              : undefined
          }
        >
          {runText}
        </SplitButton>
        <PayloadPopover open={popoverOpen} setOpen={setPopoverOpen} buttonRef={buttonRef} onSubmit={runWithPayloadMutate} />
      </>
    );
  }

  if (isA2AWorkflow) {
    return <ChatButton {...buttonCommonProps} isDarkMode={isDarkMode} />;
  }

  return (
    <Button {...buttonCommonProps} icon={<RunIcon />} onClick={runMutate}>
      {runText}
    </Button>
  );
};
