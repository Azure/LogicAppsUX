import { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Spinner, SplitButton } from '@fluentui/react-components';
import { bundleIcon, FlashFilled, FlashRegular, FlashSettingsFilled, FlashSettingsRegular } from '@fluentui/react-icons';
import type { Workflow } from '@microsoft/logic-apps-shared';
import { canRunBeInvokedWithPayload, equals, HTTP_METHODS, isNullOrEmpty, RunService, WorkflowService } from '@microsoft/logic-apps-shared';
import { useDispatch, useSelector } from 'react-redux';
import {
  getCustomCodeFilesWithData,
  getTriggerNodeId,
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
import constants from './../../common/constants';

const RunIcon = bundleIcon(FlashFilled, FlashRegular);
const RunWithPayloadIcon = bundleIcon(FlashSettingsFilled, FlashSettingsRegular);
const AllowedTriggerTypes = [
  constants.NODE.TYPE.REQUEST,
  constants.NODE.TYPE.RECURRENCE,
  constants.NODE.TYPE.API_CONNECTION,
  constants.NODE.TYPE.API_CONNECTION_NOTIFICATION,
  constants.NODE.TYPE.HTTP_WEBHOOK,
  constants.NODE.TYPE.HTTP,
  constants.NODE.TYPE.SLIDING_WINDOW,
];

export type PayloadData = {
  method?: string;
  headers?: Record<string, string>;
  queries?: Record<string, string>;
  body?: string;
};

export interface FloatingRunButtonProps {
  siteResourceId?: string;
  workflowName?: string;
  saveDraftWorkflow: (workflowDefinition: Workflow, customCodeData: any, onSuccess: () => void, isDraftSave?: boolean) => Promise<any>;
  onRun?: (runId: string) => void;
  isDarkMode: boolean;
  isDraftMode?: boolean;
  isDisabled?: boolean;
}

export const FloatingRunButton = ({
  siteResourceId,
  workflowName,
  saveDraftWorkflow,
  onRun,
  isDarkMode,
  isDraftMode,
  isDisabled,
}: FloatingRunButtonProps) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const isA2AWorkflow = useIsA2AWorkflow();
  const { operations: operationState, workflow } = useSelector((state: RootState) => state);

  // Check if the trigger type is allowed to run in DraftMode
  const isAllowedTriggerType = useMemo(() => {
    const triggerId = getTriggerNodeId(workflow);
    const info: Record<string, any> | undefined = operationState?.operationInfo;
    if (!triggerId || !info || !info[triggerId]) {
      return false;
    }

    if (!isDraftMode) {
      return true; // In non-draft mode, all triggers are allowed
    }

    const trigger = info[triggerId];

    return trigger.type && AllowedTriggerTypes.some((allowedType) => equals(trigger.type, allowedType, true));
  }, [isDraftMode, operationState?.operationInfo, workflow]);

  const canBeRunWithPayload = useMemo(
    () => isDraftMode || canRunBeInvokedWithPayload(operationState?.operationInfo),
    [isDraftMode, operationState?.operationInfo]
  );

  const runDraftWorkflow = useCallback(
    async (triggerId: string, payload?: PayloadData) => {
      try {
        if (siteResourceId && workflowName) {
          const callbackInfo: any = {
            value: `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/triggers/${triggerId}/${payload ? 'runDraftWithPayload' : 'runDraft'}`,
            method: HTTP_METHODS.POST,
          };

          // Wait 0.5 seconds, running too fast after saving causes 500 error
          await new Promise((resolve) => setTimeout(resolve, 500));
          const runResponse = await RunService().runTrigger(callbackInfo, payload);
          const runId = runResponse?.responseHeaders?.['x-ms-workflow-run-id'] ?? runResponse?.headers?.['x-ms-workflow-run-id'];
          onRun?.(runId);
        } else {
          // TODO: Handle/throw error
        }
      } catch (error) {
        console.error('Error running draft workflow:', error);
      }
    },
    [siteResourceId, workflowName, onRun]
  );

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
        return saveDraftWorkflow(
          serializedWorkflow,
          customCodeData as any,
          () => dispatch(resetDesignerDirtyState(undefined) as any),
          isDraftMode
        );
      }
    } catch (error: any) {
      console.error('Error saving workflow:', error);
    }
  }, [dispatch, saveDraftWorkflow, isDraftMode]);

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

      if (isDraftMode) {
        runDraftWorkflow(triggerId);
        return;
      }

      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      const method = saveResponse?.definition?.triggers?.[triggerId]?.inputs?.method || 'POST';
      callbackInfo.method = method;

      // Wait 0.5 seconds, running too fast after saving causes 500 error
      await new Promise((resolve) => setTimeout(resolve, 500));
      const runResponse = await RunService().runTrigger(callbackInfo, undefined);
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
  } = useMutation(async (payload: PayloadData) => {
    try {
      const saveResponse = await saveWorkflow();
      const triggerId = Object.keys(saveResponse?.definition?.triggers || {})?.[0];
      if (!triggerId) {
        return;
      }

      if (isDraftMode) {
        runDraftWorkflow(triggerId, payload);
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
    id: 'laux-v2-run-button',
    appearance: 'primary',
    shape: 'circular',
    size: 'large',
    disabled: isDisabled || runIsLoading || runWithPayloadIsLoading || !isAllowedTriggerType,
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

  if (isA2AWorkflow) {
    return (
      <ChatButton
        {...buttonCommonProps}
        isDarkMode={isDarkMode}
        isDraftMode={isDraftMode}
        siteResourceId={siteResourceId}
        workflowName={workflowName}
        saveWorkflow={saveWorkflow}
      />
    );
  }

  if (canBeRunWithPayload) {
    return (
      <>
        <SplitButton
          {...buttonCommonProps}
          primaryActionButton={{
            icon: runIsLoading ? <Spinner size="tiny" /> : <RunIcon />,
            onClick: () => {
              runMutate();
            },
            disabled: isDisabled || runIsLoading || runWithPayloadIsLoading || !isAllowedTriggerType,
          }}
          menuButton={{
            icon: runWithPayloadIsLoading ? <Spinner size="tiny" /> : <RunWithPayloadIcon />,
            onClick: () => setPopoverOpen(true),
            ref: buttonRef,
            disabled: isDisabled || runIsLoading || runWithPayloadIsLoading || !canBeRunWithPayload,
          }}
        >
          {runText}
        </SplitButton>
        <PayloadPopover
          isDraftMode={isDraftMode}
          open={popoverOpen}
          setOpen={setPopoverOpen}
          buttonRef={buttonRef}
          onSubmit={runWithPayloadMutate}
        />
      </>
    );
  }

  return (
    <Button {...buttonCommonProps} icon={runIsLoading ? <Spinner size="tiny" /> : <RunIcon />} onClick={runMutate}>
      {runText}
    </Button>
  );
};
