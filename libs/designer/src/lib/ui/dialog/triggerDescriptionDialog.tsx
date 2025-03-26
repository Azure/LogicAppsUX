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

export interface TriggerDescriptionDialogProps {
  onSubmit?: () => void;
}

export const TriggerDescriptionDialog = (props: TriggerDescriptionDialogProps) => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const isOpen = useIsTriggerDescriptionModalOpen();
  const shouldPrompt = useShouldPromptForTriggerDescription();

  const title = intl.formatMessage({
    defaultMessage: 'Set a trigger description',
    id: 'vg2Ybr',
    description: 'Title for the trigger description dialog.',
  });

  const description = intl.formatMessage({
    defaultMessage: '--- Add description here for why we want them to set a trigger description ---',
    id: 'c0/8vO',
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
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <p>{description}</p>
            <Field label={inputLabel} required={true}>
              <Textarea
                value={newDescriptionValue}
                onChange={onChange}
                placeholder={isFetchingMainActionManifest ? loadingText : inputLabel}
                disabled={isFetchingMainActionManifest}
              />
            </Field>
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={confirmCallback}>
              {confirmButtonLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
