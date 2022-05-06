import type { IDialogContentProps, IModalProps } from '@fluentui/react';
import { Dialog, DialogFooter, PrimaryButton } from '@fluentui/react';
import { useIntl } from 'react-intl';

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
  const intl = useIntl();
  if (hidden) {
    return null;
  }

  const dialogContentProps: IDialogContentProps = {
    title,
  };

  const okMessage = intl.formatMessage({
    defaultMessage: 'OK',
    description: 'OK message appearing on a alert message modal.',
  });
  return (
    <Dialog dialogContentProps={dialogContentProps} hidden={hidden} modalProps={modalProps} onDismiss={onDismiss}>
      {message}
      <DialogFooter>
        <PrimaryButton className="dialog-ok-button" onClick={onDismiss}>
          {okMessage}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  );
};
