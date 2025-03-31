import { useCallback, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { closeTriggerDescriptionModal } from '../../core/state/modal/modalSlice';
import { useIsTriggerDescriptionModalOpen, useShouldPromptForTriggerDescription } from '../../core/state/modal/modalSelectors';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Field,
  Textarea,
} from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useRootTriggerId } from '../../core/state/workflow/workflowSelectors';
import { setNodeDescription } from '../../core/state/workflow/workflowSlice';
import type { RootState } from '../../core';
import { useOperationInfo, useOperationManifest } from '../../core/state/selectors/actionMetadataSelector';
import { LOCAL_STORAGE_KEYS } from '@microsoft/logic-apps-shared';

export interface TriggerDescriptionDialogProps {
  workflowId?: string;
  onSubmit?: () => void;
}

export const TriggerDescriptionDialog = (props: TriggerDescriptionDialogProps) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const isOpen = useIsTriggerDescriptionModalOpen();
  const shouldPrompt = useShouldPromptForTriggerDescription(props.workflowId ?? '');

  const dialogTitle = intl.formatMessage({
    defaultMessage: 'Add description',
    id: 'UcFx/i',
    description: 'Title for the trigger description dialog.',
  });

  const dialogDescription = intl.formatMessage({
    defaultMessage: 'Describe the goal or purpose for this workflow. To edit this description later, open the trigger details pane.',
    id: 'XulI0a',
    description: 'Description for the trigger description dialog.',
  });

  const inputLabel = intl.formatMessage({
    defaultMessage: 'Description',
    id: 'p8AKOz',
    description: 'Label for the description textfield',
  });

  const confirmButtonLabel = intl.formatMessage({
    defaultMessage: 'Confirm',
    id: 'MLwQFB',
    description: 'Confirm button label',
  });

  const dismissButtonLabel = intl.formatMessage({
    defaultMessage: 'Dismiss',
    id: 'nxlxgi',
    description: 'Dismiss button label',
  });

  const loadingText = intl.formatMessage({
    defaultMessage: 'Loading action description...',
    id: 'rGw0g0',
    description: 'Loading text',
  });

  const triggerId = useRootTriggerId();

  const [newDescriptionValue, setDescriptionValue] = useState<string | undefined>();

  const confirmCallback = useCallback(() => {
    dispatch(setNodeDescription({ nodeId: triggerId, description: newDescriptionValue }));
    dispatch(closeTriggerDescriptionModal());
    props.onSubmit?.();
  }, [dispatch, triggerId, newDescriptionValue, props]);

  const dismissCallback = useCallback(() => {
    const localFlagKey = `${LOCAL_STORAGE_KEYS.IGNORE_EMPTY_TRIGGER_DESCRIPTION}-${props.workflowId}`;
    localStorage.setItem(localFlagKey, 'true');
    dispatch(closeTriggerDescriptionModal());
  }, [dispatch, props.workflowId]);

  const mainActionId = useSelector((state: RootState) => Object.keys(state.workflow.operations)?.[1]);
  const mainActionOperationInfo = useOperationInfo(mainActionId);
  const { data: mainActionManifest, isFetching: isFetchingMainActionManifest } = useOperationManifest(mainActionOperationInfo);

  useEffect(() => {
    if (isFetchingMainActionManifest) {
      return;
    }
    const defaultDescription = mainActionManifest?.properties.description || '(No description)';
    setDescriptionValue(defaultDescription);
  }, [mainActionManifest, isFetchingMainActionManifest]);

  const onChange = useCallback((_: any, data: any) => {
    setDescriptionValue(data.value);
  }, []);

  return (
    <Dialog open={isOpen && shouldPrompt}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogContent>
            <p>{dialogDescription}</p>
            <Field label={inputLabel} style={{ padding: '12px 0' }}>
              <Textarea
                value={newDescriptionValue}
                onChange={onChange}
                placeholder={isFetchingMainActionManifest ? loadingText : inputLabel}
                disabled={isFetchingMainActionManifest}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={dismissCallback}>
              {dismissButtonLabel}
            </Button>
            <Button appearance="primary" onClick={confirmCallback} disabled={isFetchingMainActionManifest}>
              {confirmButtonLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
