import { DefaultButton, Dialog, DialogFooter, IDialogContentProps, IModalProps, PrimaryButton } from '@fluentui/react';
import { FormattedMessage } from 'react-intl';

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
  if (hidden) {
    return null;
  }

  const dialogContentProps: IDialogContentProps = {
    title,
  };

  return (
    <Dialog dialogContentProps={dialogContentProps} hidden={hidden} modalProps={modalProps} onDismiss={onDismiss}>
      {message}
      <DialogFooter>
        <PrimaryButton className="dialog-ok-button" onClick={onConfirm}>
          <FormattedMessage defaultMessage="OK" description="OK message appearing on a confirmation dialog." />
        </PrimaryButton>
        <DefaultButton onClick={onDismiss}>
          <FormattedMessage defaultMessage="Cancel" description="Cancel message appearing on a confirmation dialog." />
        </DefaultButton>
      </DialogFooter>
    </Dialog>
  );
};
