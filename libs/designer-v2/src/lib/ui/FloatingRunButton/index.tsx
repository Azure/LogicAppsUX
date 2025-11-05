import { useCallback, useMemo, useRef, useState } from 'react';
import { useIntl } from 'react-intl';
import { useMutation } from '@tanstack/react-query';
import { Button, Spinner, SplitButton, Tooltip, Badge, MessageBar, MessageBarBody, MessageBarTitle } from '@fluentui/react-components';
import { bundleIcon, FlashFilled, FlashRegular, FlashSettingsFilled, FlashSettingsRegular, ImportantFilled } from '@fluentui/react-icons';
import type { Workflow } from '@microsoft/logic-apps-shared';
import {
  canRunBeInvokedWithPayload,
  equals,
  HTTP_METHODS,
  isNullOrEmpty,
  parseErrorMessage,
  RunService,
  WorkflowService,
} from '@microsoft/logic-apps-shared';
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
import { useFloatingRunButtonStyles } from './styles';

const ErrorIcon = ImportantFilled;

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
  tooltipOverride?: string;
  chatProps?: {
    disabled?: boolean;
    tooltipText?: string;
  };
}

export const FloatingRunButton = ({
  siteResourceId,
  workflowName,
  saveDraftWorkflow,
  onRun,
  isDarkMode,
  isDraftMode,
  isDisabled,
  tooltipOverride,
  chatProps,
}: FloatingRunButtonProps) => {
  const intl = useIntl();

  const [runHasPayload, setRunHasPayload] = useState<boolean>(false);

  const [runStatusMessage, setRunStatusMessage] = useState<string | null>(null);
  const runStatusMessages = useMemo(
    () => ({
      saving: intl.formatMessage({
        defaultMessage: 'Saving workflow...',
        id: '2aC0Xh',
        description: 'Status message displayed when the workflow is being saved',
      }),
      savingDraft: intl.formatMessage({
        defaultMessage: 'Saving draft workflow...',
        id: 'Z8uBn6',
        description: 'Status message displayed when the draft workflow is being saved',
      }),
      running: intl.formatMessage({
        defaultMessage: 'Running workflow...',
        id: 'MrvtIU',
        description: 'Status message displayed when the workflow is being run',
      }),
      runningDraft: intl.formatMessage({
        defaultMessage: 'Running draft workflow...',
        id: 'LX3q/+',
        description: 'Status message displayed when the draft workflow is being run',
      }),
      error: intl.formatMessage({
        defaultMessage: 'An error occurred',
        id: 'cqHOAP',
        description: 'Status message displayed when there is an error running the workflow',
      }),
    }),
    [intl]
  );

  const styles = useFloatingRunButtonStyles();

  const dispatch = useDispatch();
  const isA2AWorkflow = useIsA2AWorkflow();
  const { operations: operationState, workflow } = useSelector((state: RootState) => state);
  const triggerId = useMemo(() => getTriggerNodeId(workflow), [workflow]);

  // Check if the trigger type is allowed to run in DraftMode
  const isAllowedTriggerType = useMemo(() => {
    const info: Record<string, any> | undefined = operationState?.operationInfo;
    if (!triggerId || !info || !info[triggerId]) {
      return false;
    }

    if (!isDraftMode) {
      return true; // In non-draft mode, all triggers are allowed
    }

    const trigger = info[triggerId];

    return trigger.type && AllowedTriggerTypes.some((allowedType) => equals(trigger.type, allowedType, true));
  }, [isDraftMode, operationState?.operationInfo, triggerId]);

  const canBeRunWithPayload = useMemo(
    () => isDraftMode || canRunBeInvokedWithPayload(operationState?.operationInfo),
    [isDraftMode, operationState?.operationInfo]
  );

  const runDraftWorkflow = useCallback(
    async (triggerId: string, payload?: PayloadData) => {
      let contentBody = payload?.body;
      const headers = payload?.headers ?? {};

      setRunStatusMessage(runStatusMessages.runningDraft);

      // Try to parse body as JSON
      try {
        contentBody = contentBody ? JSON.parse(contentBody) : undefined;
      } catch (err) {
        contentBody = payload?.body;
        console.error('Error parsing JSON body:', err);
      }

      // Set Content-Type header if body is JSON
      if (contentBody && typeof contentBody === 'object') {
        headers['Content-Type'] = 'application/json';
      }

      try {
        const callbackInfo: any = {
          value: `${siteResourceId}/hostruntime/runtime/webhooks/workflow/api/management/workflows/${workflowName}/triggers/${triggerId}/${contentBody ? 'runDraftWithPayload' : 'runDraft'}`,
          method: HTTP_METHODS.POST,
        };

        // Wait 0.5 seconds, running too fast after saving causes 500 error
        await new Promise((resolve) => setTimeout(resolve, 500));
        const runResponse = await RunService().runTrigger(callbackInfo, {
          headers,
          body: contentBody,
        });
        const runId = runResponse?.responseHeaders?.['x-ms-workflow-run-id'] ?? runResponse?.headers?.['x-ms-workflow-run-id'];
        onRun?.(runId);
      } catch (error) {
        setRunStatusMessage(null);
        throw error;
      }

      setRunStatusMessage(null);
    },
    [runStatusMessages, siteResourceId, workflowName, onRun]
  );

  const saveWorkflow = useCallback(async () => {
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
  }, [dispatch, saveDraftWorkflow, isDraftMode]);

  const {
    mutate: runMutate,
    isLoading: runIsLoading,
    error: runError,
  } = useMutation(async (payload?: PayloadData | undefined) => {
    try {
      setRunStatusMessage(isDraftMode ? runStatusMessages.savingDraft : runStatusMessages.saving);
      const saveResponse = await saveWorkflow();
      const triggerId = Object.keys(saveResponse?.definition?.triggers || {})?.[0];
      if (!triggerId) {
        return;
      }

      setRunHasPayload(!!payload);

      if (isDraftMode) {
        await runDraftWorkflow(triggerId, payload);
        return;
      }

      const callbackInfo = await WorkflowService().getCallbackUrl(triggerId);
      callbackInfo.method = payload ? payload?.method : saveResponse?.definition?.triggers?.[triggerId]?.inputs?.method || 'POST';

      // Wait 0.5 seconds, running too fast after saving causes 500 error
      await new Promise((resolve) => setTimeout(resolve, 500));
      setRunStatusMessage(runStatusMessages.running);
      const runResponse = await RunService().runTrigger(callbackInfo, payload);
      const runId = runResponse?.responseHeaders?.['x-ms-workflow-run-id'] ?? runResponse?.headers?.['x-ms-workflow-run-id'];
      onRun?.(runId);
    } catch (error: any) {
      setRunStatusMessage(null);
      throw error;
    }
    setRunStatusMessage(null);
  });

  const mainButtonRef = useRef<HTMLButtonElement>(null);
  const payloadButtonRef = useRef(null);

  const buttonCommonProps: any = {
    id: 'laux-v2-run-button',
    ref: mainButtonRef,
    appearance: 'primary',
    shape: 'circular',
    size: 'large',
    disabled: isDisabled || runIsLoading || !isAllowedTriggerType,
  };

  const strings = useMemo(
    () => ({
      NEUTRAL_TOOLTIP_PUBLISHED: intl.formatMessage({
        defaultMessage: 'Run published workflow',
        id: 'KV+9pl',
        description: 'Tooltip for Run button when published workflow is shown',
      }),
      NEUTRAL_TOOLTIP_DRAFT: intl.formatMessage({
        defaultMessage: 'Run draft workflow',
        id: 'opvqoT',
        description: 'Tooltip for Run button when draft workflow is shown',
      }),
      RUN_TEXT: intl.formatMessage({
        defaultMessage: 'Run',
        id: 'd8JU5h',
        description: 'Run button text',
      }),
      RUN_PAYLOAD_TOOLTIP: intl.formatMessage({
        defaultMessage: 'Run with payload',
        id: 'JrAqnE',
        description: 'Tooltip for Run with payload button',
      }),
      ERROR_BADGE_TITLE: intl.formatMessage({
        defaultMessage: 'Error running workflow',
        id: 'SRN6ij',
        description: 'Tooltip title when there is an error running the workflow',
      }),
    }),
    [intl]
  );

  const tooltipText = useMemo(
    () => tooltipOverride ?? runStatusMessage ?? (isDraftMode ? strings.NEUTRAL_TOOLTIP_DRAFT : strings.NEUTRAL_TOOLTIP_PUBLISHED),
    [tooltipOverride, runStatusMessage, isDraftMode, strings]
  );

  const [popoverOpen, setPopoverOpen] = useState(false);

  if (isA2AWorkflow) {
    return (
      <div className={styles.container}>
        <ChatButton
          {...buttonCommonProps}
          isDarkMode={isDarkMode}
          isDraftMode={isDraftMode}
          siteResourceId={siteResourceId}
          workflowName={workflowName}
          saveWorkflow={saveWorkflow}
          tooltipText={tooltipOverride ?? chatProps?.tooltipText}
        />
      </div>
      <ChatButton
        {...buttonCommonProps}
        disabled={buttonCommonProps.disabled || chatProps?.disabled}
        isDarkMode={isDarkMode}
        isDraftMode={isDraftMode}
        siteResourceId={siteResourceId}
        workflowName={workflowName}
        saveWorkflow={saveWorkflow}
        tooltipText={chatProps?.tooltipText}
      />
    );
  }

  if (canBeRunWithPayload) {
    return (
      <div className={styles.container}>
        <Tooltip withArrow content={tooltipText} relationship="description">
          <SplitButton
            {...buttonCommonProps}
            primaryActionButton={{
              icon: runIsLoading && !runHasPayload ? <Spinner size="tiny" /> : <RunIcon />,
              onClick: () => {
                runMutate(undefined);
              },
              disabled: isDisabled || runIsLoading || !isAllowedTriggerType || !triggerId,
            }}
            menuButton={{
              icon: runIsLoading && runHasPayload ? <Spinner size="tiny" /> : <RunWithPayloadIcon />,
              onClick: () => setPopoverOpen(true),
              ref: payloadButtonRef,
              disabled: isDisabled || runIsLoading || !canBeRunWithPayload || !triggerId,
            }}
          >
            {strings.RUN_TEXT}
          </SplitButton>
        </Tooltip>
        <PayloadPopover
          isDraftMode={isDraftMode}
          open={popoverOpen}
          setOpen={setPopoverOpen}
          buttonRef={payloadButtonRef}
          onSubmit={runMutate}
        />
        {runError ? (
          <Tooltip
            relationship="description"
            content={{
              className: styles.errorTooltip,
              children: (
                <MessageBar intent="error" layout="multiline">
                  <MessageBarBody>
                    <MessageBarTitle>{strings.ERROR_BADGE_TITLE}</MessageBarTitle>
                    <br />
                    {parseErrorMessage(runError)}
                  </MessageBarBody>
                </MessageBar>
              ),
            }}
          >
            <Badge className={styles.errorBadge} color="danger" icon={<ErrorIcon />} />
          </Tooltip>
        ) : null}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Button {...buttonCommonProps} icon={runIsLoading ? <Spinner size="tiny" /> : <RunIcon />} onClick={runMutate}>
        {strings.RUN_TEXT}
      </Button>
    </div>
  );
};
