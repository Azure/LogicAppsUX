import { closeAllWarning, setOkClicked } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { Dialog, DialogFooter, DefaultButton, PrimaryButton } from '@fluentui/react';
import { useCallback } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const WarningModal: FunctionComponent = () => {
  const isWarningModalOpen = useSelector((state: RootState) => state.modal.isWarningModalOpen);
  // const isOkClicked = useSelector((state: RootState) => state.modal.isOkClicked);

  const dispatch = useDispatch<AppDispatch>();
  const intl = useIntl();

  const warningHeader = intl.formatMessage({
    defaultMessage: 'Warning',
    description: 'Header text for warning the user for not being allowed to go back to make changes',
  });
  const warningMessage = intl.formatMessage({
    defaultMessage: 'You will not be able to go back. Do you want to proceed?',
    description:
      'Message to inform users that they will not be able to revert back to previous changes and to ask if they want to proceed.',
  });
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
