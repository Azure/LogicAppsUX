import type { IDialogContentProps, IModalProps } from '@fluentui/react';
import { DefaultButton, Dialog, DialogFooter, PrimaryButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

export interface ConfirmProps {
  hidden: boolean;
  message: string;
  title: string;
  onConfirm(): void;
  onDismiss(): void;
}

const modalProps: IModalProps = {
  isBlocking: true,
  firstFocusableSelector: 'dialog-ok-button',
};

export const Confirm: React.FC<ConfirmProps> = ({ hidden, message, title, onConfirm, onDismiss }) => {
  const intl = useIntl();
  if (hidden) {
    return null;
  }

  const dialogContentProps: IDialogContentProps = {
    title,
  };

  const okMessage = intl.formatMessage({
    defaultMessage: 'OK',
    id: 'ec64a4f7df72',
    description: 'OK message appearing on a confirmation dialog.',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: '894b3ba6fc64',
    description: 'Cancel message appearing on a confirmation dialog.',
  });
  return (
    <Dialog dialogContentProps={dialogContentProps} hidden={hidden} modalProps={modalProps} onDismiss={onDismiss}>
      {message}
      <DialogFooter>
        <PrimaryButton className="dialog-ok-button" onClick={onConfirm}>
          {okMessage}
        </PrimaryButton>
        <DefaultButton onClick={onDismiss}>{cancelMessage}</DefaultButton>
      </DialogFooter>
    </Dialog>
  );
};
