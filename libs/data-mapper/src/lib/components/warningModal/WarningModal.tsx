import { closeAllWarning, setOkClicked, WarningModalState } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Dialog, DialogFooter, DefaultButton, PrimaryButton } from '@fluentui/react';
import { useCallback } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const WarningModal: FunctionComponent = () => {
  const isWarningModalOpen = useSelector((state: RootState) => state.modal.isWarningModalOpen);
  const warningModalType = useSelector((state: RootState) => state.modal.warningModalType);

  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const warningHeader = intl.formatMessage({
    defaultMessage: 'Warning',
    description: 'Header text for warning the user for not being allowed to go back to make changes',
  });
  const warningMessage =
    warningModalType === WarningModalState.DiscardWarning
      ? intl.formatMessage({
          defaultMessage: 'All unsaved work will be gone. Do you want to proceed to discard everything?',
          description:
            'Message to inform users that they will not be able to revert back to previous changes and to ask if they want to proceed.',
        })
      : warningModalType === WarningModalState.ChangeInputWarning
      ? intl.formatMessage({
          defaultMessage:
            'Source schema will be replaced and you will not be able to go back to previous changes. Do you want to proceed to change source schema?',
          description:
            'Message to inform users that they will not be able to revert back to previous changes after changing source schema and to ask if they still want to proceed',
        })
      : warningModalType === WarningModalState.ChangeOutputWarning
      ? intl.formatMessage({
          defaultMessage:
            'Target schema will be replaced and you will not be able to go back to previous changes. Do you want to proceed to change target schema?',
          description:
            'Message to inform users that they will not be able to revert back to previous changes after changing target schema and to ask if they still want to proceed',
        })
      : '';
  const okMessage = intl.formatMessage({
    defaultMessage: 'OK',
    description: 'Button text for OK to proceed with agreeing to the warning displayed',
  });
  const cancelMessage = intl.formatMessage({
    defaultMessage: 'Cancel',
    description: 'Button text for Cancel to stop proceeding by reading the warning displayed',
  });

  const closeWarningModal = useCallback(() => {
    dispatch(closeAllWarning());
  }, [dispatch]);

  const dialogContentProps = {
    title: warningHeader,
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
            text={okMessage}
          />
          <DefaultButton onClick={closeWarningModal} text={cancelMessage} />
        </DialogFooter>
      </Dialog>
    </div>
  );
};
