import { DefaultButton, PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import * as React from 'react';
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

export const Confirm = ({ hidden, message, title, onConfirm, onDismiss }: ConfirmProps): JSX.Element | null => {
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
