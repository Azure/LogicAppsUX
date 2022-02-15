import { Dialog, DialogFooter, IDialogContentProps, IModalProps, PrimaryButton } from '@fluentui/react';
import { FormattedMessage } from 'react-intl';

export interface AlertProps {
  hidden: boolean;
  message: string;
  title: string;
  onDismiss(): void;
}

const modalProps: IModalProps = {
  isBlocking: true,
  firstFocusableSelector: 'dialog-ok-button',
};

export const Alert: React.FC<AlertProps> = ({ hidden, message, title, onDismiss }) => {
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
        <PrimaryButton className="dialog-ok-button" onClick={onDismiss}>
          <FormattedMessage defaultMessage="OK" description="OK message appearing on a alert message modal." />
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  );
};
