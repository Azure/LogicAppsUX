import { Button, Dialog, DialogActions, DialogContent, DialogSurface, DialogTrigger } from '@fluentui/react-components';
import type { AppDispatch, RootState } from '../core/state/Store';
import { useDispatch, useSelector } from 'react-redux';
import { useIntl } from 'react-intl';
import { useCallback, useMemo } from 'react';
import { closeModal } from '../core/state/ModalSlice';
import { setInitialDataMap, setInitialSchema } from '../core/state/DataMapSlice';
import { SchemaType } from '@microsoft/logic-apps-shared';

const DialogView = () => {
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();
  const { isWarningModalOpen } = useSelector((state: RootState) => state.modal);
  const { sourceSchema, targetSchema, dataMapConnections, loadedMapMetadata } = useSelector(
    (state: RootState) => state.dataMap.present.pristineDataMap
  );

  const closeDiscardWarningModal = useCallback(() => {
    dispatch(closeModal());
  }, [dispatch]);

  const onDiscardClick = useCallback(() => {
    dispatch(closeModal());

    if (sourceSchema) {
      dispatch(
        setInitialSchema({
          schema: sourceSchema,
          schemaType: SchemaType.Source,
        })
      );
    }

    if (targetSchema) {
      dispatch(
        setInitialSchema({
          schema: targetSchema,
          schemaType: SchemaType.Target,
        })
      );
    }

    if (sourceSchema && targetSchema && dataMapConnections && loadedMapMetadata) {
      dispatch(
        setInitialDataMap({
          sourceSchema,
          targetSchema,
          dataMapConnections,
          metadata: loadedMapMetadata,
        })
      );
    }
  }, [dataMapConnections, dispatch, loadedMapMetadata, sourceSchema, targetSchema]);

  const stringResources = useMemo(
    () => ({
      DISCARD_MESSAGE: intl.formatMessage({
        defaultMessage: 'You will lose all unsaved changes. Are you sure you want to discard the changes?',
        id: 'msb6dd69242979',
        description: 'Discard message for the unsaved changes',
      }),
      CANCEL: intl.formatMessage({
        defaultMessage: 'Cancel',
        id: 'ms9e8f9b9550ab',
        description: 'Button text for cancel the dialog',
      }),
      DISCARD: intl.formatMessage({
        defaultMessage: 'Discard',
        id: 'msfc856e18f37a',
        description: 'Button text for discard the dialog',
      }),
    }),
    [intl]
  );
  return (
    <Dialog open={isWarningModalOpen}>
      <DialogSurface>
        <DialogContent>{stringResources.DISCARD_MESSAGE}</DialogContent>
        <DialogActions>
          <DialogTrigger disableButtonEnhancement>
            <Button appearance="secondary" onClick={closeDiscardWarningModal}>
              {stringResources.CANCEL}
            </Button>
          </DialogTrigger>
          <Button appearance="primary" onClick={onDiscardClick}>
            {stringResources.DISCARD}
          </Button>
        </DialogActions>
      </DialogSurface>
    </Dialog>
  );
};

export default DialogView;
