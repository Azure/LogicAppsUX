import { PrimaryButton } from '@fluentui/react/lib/Button';
import type { IDialogContentProps, IDialogStyleProps, IDialogStyles } from '@fluentui/react/lib/Dialog';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import type { IModalProps } from '@fluentui/react/lib/Modal';
import type { IStyleFunction } from '@fluentui/react/lib/Utilities';
import * as React from 'react';

export interface ModalDialogProps {
  confirmText: string;
  isOpen: boolean;
  title?: string;
  children?: React.ReactNode;
  getStyles?: IStyleFunction<IDialogStyleProps, IDialogStyles>;

  onConfirm: React.MouseEventHandler<HTMLElement>;
  onDismiss: () => void;
}

const modalProps: IModalProps = {
  className: 'msla-modal-dialog',
};
const dialogContentProps: IDialogContentProps = {
  type: DialogType.close,
};

export const ModalDialog = ({ confirmText, isOpen, title, children, getStyles, onConfirm, onDismiss }: ModalDialogProps): JSX.Element => {
  const handleConfirm = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    if (onConfirm) {
      onConfirm(e);
    }
  };
  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleModalBodyClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };
  return (
    <Dialog
      dialogContentProps={dialogContentProps}
      hidden={!isOpen}
      modalProps={modalProps}
      styles={getStyles}
      title={title}
      onDismiss={handleDismiss}
    >
      <div className="msla-modal-content" onClick={handleModalBodyClick}>
        <div className="msla-modal-body">{children}</div>
      </div>
      <DialogFooter>
        <PrimaryButton autoFocus onClick={handleConfirm}>
          {confirmText}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  );
};
