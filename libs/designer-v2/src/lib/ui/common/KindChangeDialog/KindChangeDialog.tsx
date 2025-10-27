import { useIntl } from 'react-intl';
import { Button, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components';
import { closeKindChangeDialog, useKindChangeDialogType } from '../../../core';
import { useDispatch } from 'react-redux';

export const KindChangeDialog = () => {
  const intl = useIntl();
  const dispatch = useDispatch();

  const kindChangeDialogType = useKindChangeDialogType();

  const defaultTitleText = intl.formatMessage({
    defaultMessage: 'Update workflow before using this trigger',
    id: 'EE1vyH',
    description: 'Title for dialog that appears when changing the kind of a node',
  });

  const toA2ADescription = intl.formatMessage({
    defaultMessage:
      "Using a chat message trigger means your workflow will be conversational, which doesn't support actions running after an agentic loop. Delete any actions running after an agent to use this trigger.",
    id: '+jvca5',
    description: 'Description for dialog that appears when changing the kind of a node',
  });

  const toStatefulDescription = intl.formatMessage({
    defaultMessage:
      'Using this trigger changes your workflow to a type that doesn’t support handoffs. Delete any handoffs to use this trigger.',
    id: 'vz+t4/',
    description: 'Description for dialog that appears when changing the kind of a node to a stateful kind',
  });

  const statelessTitleText = intl.formatMessage({
    defaultMessage: 'Invalid trigger for stateless workflow',
    id: 'QmhiIM',
    description: 'Title for dialog that appears when changing the kind of a node to stateless',
  });

  const fromStatelessDescription = intl.formatMessage({
    defaultMessage: 'This preview version of logic apps does not yet support stateless logic apps using the chat message trigger.',
    id: 'jDYilS',
    description: 'Description for dialog that appears when changing the kind of a node from stateless',
  });

  const closeText = intl.formatMessage({
    defaultMessage: 'Close',
    id: 'MfbsN6',
    description: 'Label for the close button in the kind change dialog',
  });

  const titleText = kindChangeDialogType === 'fromStateless' ? statelessTitleText : defaultTitleText;

  const descriptionText =
    kindChangeDialogType === 'toA2A'
      ? toA2ADescription
      : kindChangeDialogType === 'toStateful'
        ? toStatefulDescription
        : kindChangeDialogType === 'fromStateless'
          ? fromStatelessDescription
          : null;

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
