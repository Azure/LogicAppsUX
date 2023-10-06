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
  layerProps: {
    eventBubblingEnabled: true,
  },
};

export const ModalDialog = ({ confirmText, isOpen, title, children, getStyles, onConfirm, onDismiss }: ModalDialogProps): JSX.Element => {
  const dialogContentProps: IDialogContentProps = {
    type: DialogType.close,
    title,
  };
  const handleConfirm = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    onConfirm(e);
  };
  const handleDismiss = () => {
    onDismiss();
  };

  const handleModalBodyClick = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
  };
  return (
    <Dialog dialogContentProps={dialogContentProps} hidden={!isOpen} modalProps={modalProps} styles={getStyles} onDismiss={handleDismiss}>
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
