import { PrimaryButton } from '@fluentui/react/lib/Button';
import { Dialog, DialogFooter, IDialogContentProps } from '@fluentui/react/lib/Dialog';
import { IModalProps } from '@fluentui/react/lib/Modal';
import * as React from 'react';
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

export function Alert(props: AlertProps): JSX.Element | null {
  const { hidden, message, title, onDismiss } = props;
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
}
