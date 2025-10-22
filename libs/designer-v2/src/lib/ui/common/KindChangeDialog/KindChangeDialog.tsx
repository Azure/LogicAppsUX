import { useIntl } from 'react-intl';
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components';
import { closeKindChangeDialog, useKindChangeDialogType } from '../../../core';
import { useDispatch } from 'react-redux';

export const KindChangeDialog = () => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const kindChangeDialogType = useKindChangeDialogType();

  const titleText = intl.formatMessage({
    defaultMessage: 'Kind change',
    id: 'PCNZxg',
    description: 'Title for dialog that appears when changing the kind of a node',
  });

  const toA2ADescription = intl.formatMessage({
    defaultMessage:
      'This operation will change the workflow to be a conversational (A2A) workflow. In the current preview, conversational workflows are unable to have workflow actions running after an agent. Please esure that your agent does not have any actions after it and try this operation again.',
    id: 'KZZ69j',
    description: 'Description for dialog that appears when changing the kind of a node',
  });

  const toStatefulDescription = intl.formatMessage({
    defaultMessage:
      'This operation will change the workflow to be a stateful workflow. Stateful workflows do not support agent handoffs. Please remove any agent handoffs from your workflow and try this operation again.',
    id: 'FAgEpx',
    description: 'Description for dialog that appears when changing the kind of a node to a stateful kind',
  });

  const closeText = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'MfbsN6',
    description: 'Label for the close button in the kind change dialog',
  });

  const descriptionText = kindChangeDialogType === 'toA2A' ? toA2ADescription : toStatefulDescription;

  const closeCallback = () => {
    dispatch(closeKindChangeDialog());
  };

  return (
    <Dialog open={!!kindChangeDialogType} onOpenChange={closeCallback}>
      <DialogSurface>
        <DialogTitle>{titleText}</DialogTitle>
        <DialogBody>
          <DialogContent>{descriptionText}</DialogContent>
          <DialogActions>
            <Button onClick={closeCallback}>{closeText}</Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
