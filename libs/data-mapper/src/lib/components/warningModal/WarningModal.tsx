import { closeModal, setModalOkClicked } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Dialog, DialogFooter, DefaultButton, PrimaryButton } from '@fluentui/react';
import { useCallback } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const WarningModal: FunctionComponent = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isWarningModalOpen = useSelector((state: RootState) => state.modal.isWarningModalOpen);

  const discardChangesHeaderLoc = intl.formatMessage({
    defaultMessage: 'Discard changes',
    description: 'Header text for discard modal',
  });

  const discardChangesMessageLoc = intl.formatMessage({
    defaultMessage: 'Do you want to discard all unsaved changes?',
    description: 'Discard warning text',
  });

  const discardLoc = intl.formatMessage({
    defaultMessage: 'Discard',
    description: 'Discard',
  });

  const cancelLoc = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Cancel',
  });

  const onClickOk = useCallback(() => {
    dispatch(setModalOkClicked());
  }, [dispatch]);

  const closeWarningModal = useCallback(() => {
    dispatch(closeModal());
  }, [dispatch]);

  return (
    <Dialog
      hidden={!isWarningModalOpen}
      onDismiss={closeWarningModal}
      dialogContentProps={{
        title: discardChangesHeaderLoc,
        subText: discardChangesMessageLoc,
      }}
      modalProps={{ isBlocking: true }}
    >
      <DialogFooter>
        <PrimaryButton onClick={onClickOk} text={discardLoc} />
        <DefaultButton onClick={closeWarningModal} text={cancelLoc} />
      </DialogFooter>
    </Dialog>
  );
};
