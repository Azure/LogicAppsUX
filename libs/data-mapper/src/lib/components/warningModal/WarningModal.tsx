import { closeAllWarning, setOkClicked, WarningModalState } from '../../core/state/ModalSlice';
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
  const warningModalType = useSelector((state: RootState) => state.modal.warningModalType);

  const warningHeader = intl.formatMessage({
    defaultMessage: 'Warning',
    description: 'Header text for warning modal',
  });

  const discardChangesHeader = intl.formatMessage({
    defaultMessage: 'Discard changes',
    description: 'Header text for discard modal',
  });

  let warningMessage: string;

  switch (warningModalType) {
    case WarningModalState.DiscardWarning:
      warningMessage = intl.formatMessage({
        defaultMessage: 'Do you want to discard all unsaved changes?',
        description: 'Discard warning text',
      });
      break;
    case WarningModalState.ChangeSourceWarning:
      warningMessage = intl.formatMessage({
        defaultMessage:
          'Source schema will be replaced and you will not be able to go back to previous changes. Do you want to proceed to change source schema?',
        description: 'Change source schema warning text',
      });
      break;
    case WarningModalState.ChangeTargetWarning:
      warningMessage = intl.formatMessage({
        defaultMessage:
          'Target schema will be replaced and you will not be able to go back to previous changes. Do you want to proceed to change target schema?',
        description: 'Change target schema text',
      });
      break;
    default:
      warningMessage = '';
  }

  const discardMessage = intl.formatMessage({
    defaultMessage: 'Discard',
    description: 'Discard',
  });

  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button text for Cancel to stop proceeding by reading the warning displayed',
  });

  const closeWarningModal = useCallback(() => {
    dispatch(closeAllWarning());
  }, [dispatch]);

  const dialogContentProps = {
    title: warningModalType === WarningModalState.DiscardWarning ? discardChangesHeader : warningHeader,
    subText: warningMessage,
  };

  return (
    <div>
      <Dialog
        hidden={!isWarningModalOpen}
        onDismiss={closeWarningModal}
        dialogContentProps={dialogContentProps}
        modalProps={{ isBlocking: true }}
      >
        <DialogFooter>
          <PrimaryButton
            onClick={() => {
              dispatch(setOkClicked());
            }}
            text={discardMessage}
          />
          <DefaultButton onClick={closeWarningModal} text={cancelMessage} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
