import { PrimaryButton } from '@fluentui/react/lib/Button';
import type { IDialogContentProps, IDialogStyleProps, IDialogStyles } from '@fluentui/react/lib/Dialog';
import { Dialog, DialogFooter, DialogType } from '@fluentui/react/lib/Dialog';
import type { IModalProps } from '@fluentui/react/lib/Modal';
import type { IStyleFunction } from '@fluentui/react/lib/Utilities';
import type * as React from 'react';
import { useModalDialogStyles } from './modaldialog.styles';

export interface ModalDialogProps {
  confirmText: string;
  isOpen: boolean;
  title?: string;
  children?: React.ReactNode;
  getStyles?: IStyleFunction<IDialogStyleProps, IDialogStyles>;

  onConfirm: React.MouseEventHandler<HTMLElement>;
  onDismiss: () => void;
}

export const ModalDialog = ({ confirmText, isOpen, title, children, getStyles, onConfirm, onDismiss }: ModalDialogProps): JSX.Element => {
  const styles = useModalDialogStyles();

  const modalProps: IModalProps = {
    className: styles.modalDialog,
    layerProps: {
      eventBubblingEnabled: true,
    },
  };

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
      <div className={styles.modalContent} onClick={handleModalBodyClick}>
        <div className={styles.modalBody}>{children}</div>
      </div>
      <DialogFooter>
        <PrimaryButton autoFocus onClick={handleConfirm}>
          {confirmText}
        </PrimaryButton>
      </DialogFooter>
    </Dialog>
  );
};
