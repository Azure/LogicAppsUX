import { closeModal, setModalOkClicked } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import {
  Button,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  DialogTrigger,
} from '@fluentui/react-components';
import { useCallback } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const WarningModal: FunctionComponent = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isWarningModalOpen = useSelector((state: RootState) => state.modal.isWarningModalOpen);

  const discardChangesTitleLoc = intl.formatMessage({
    defaultMessage: 'Discard changes',
    id: 'ms711f51b55887',
    description: 'Title for discard modal',
  });

  const discardChangesMessageLoc = intl.formatMessage({
    defaultMessage: 'Do you want to discard all unsaved changes?',
    id: 'msa1554fb2da21',
    description: 'Discard warning message',
  });

  const cancelLoc = intl.formatMessage({
    defaultMessage: 'Cancel',
    id: 'mse8f74e732301',
    description: 'Cancel',
  });

  const discardLoc = intl.formatMessage({
    defaultMessage: 'Discard',
    id: 'msbe50f29cf392',
    description: 'Discard',
  });

  const onClickOk = useCallback(() => {
    dispatch(setModalOkClicked());
  }, [dispatch]);

  const closeWarningModal = useCallback(() => {
    dispatch(closeModal());
  }, [dispatch]);

  return (
    <Dialog modalType="alert" open={isWarningModalOpen}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{discardChangesTitleLoc}</DialogTitle>
          <DialogContent>{discardChangesMessageLoc}</DialogContent>

          <DialogActions>
            <DialogTrigger>
              <Button onClick={closeWarningModal}>{cancelLoc}</Button>
            </DialogTrigger>
            <Button appearance="primary" onClick={onClickOk}>
              {discardLoc}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
