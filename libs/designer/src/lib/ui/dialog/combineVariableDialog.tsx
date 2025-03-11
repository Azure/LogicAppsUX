import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../core/store';
import { closeModal } from '../../core/state/modal/modalSlice';
import { Button, Checkbox, Dialog, DialogActions, DialogBody, DialogContent, DialogSurface, DialogTitle } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { LOCAL_STORAGE_KEYS } from '@microsoft/logic-apps-shared';

export const CombineInitializeVariableDialog = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const { isOpen, resolve } = useSelector((state: RootState) => state.modal);

  const [rememberChoice, setRememberChoice] = useState(false);

  useEffect(() => {
    // Reset checkbox when modal opens
    if (isOpen) {
      setRememberChoice(false);
    }
  }, [isOpen]);

  const handleSelection = (combine: boolean) => {
    if (rememberChoice) {
      localStorage.setItem(LOCAL_STORAGE_KEYS.COMBINE_INITIALIZE_VARIABLES, JSON.stringify(combine));
    }
    dispatch(closeModal(combine));
    resolve?.(combine);
  };

  const title = intl.formatMessage({
    defaultMessage: 'Combine Initialize Variables (preview)',
    id: '8opHew',
    description: 'Title for the combine variable dialog. This is a preview feature.',
  });

  const description = intl.formatMessage({
    defaultMessage:
      'There are multiple consecutive Initialize Variable actions in this workflow. Would you like to combine them into a single action?',
    id: '0JIDLK',
    description: 'Description for the combine variable dialog.',
  });

  const combineLabel = intl.formatMessage({
    defaultMessage: 'Yes',
    id: 'r/P4gM',
    description: 'Answer yes to combine button label',
  });

  const doNotCombineLabel = intl.formatMessage({
    defaultMessage: 'No',
    id: 'faPcYk',
    description: 'Answer no to combine button label',
  });

  const rememberChoiceLabel = intl.formatMessage({
    defaultMessage: 'Remember my choice',
    id: 'BwOKWK',
    description: 'Label for the remember choice checkbox',
  });

  return (
    <Dialog open={isOpen}>
      <DialogSurface>
        <DialogBody>
          <DialogTitle>{title}</DialogTitle>
          <DialogContent>
            <p>{description}</p>
            <Checkbox
              checked={rememberChoice}
              onChange={(_e, data) => setRememberChoice(Boolean(data.checked))}
              label={rememberChoiceLabel}
            />
          </DialogContent>
          <DialogActions>
            <Button appearance="primary" onClick={() => handleSelection(true)}>
              {combineLabel}
            </Button>
            <Button appearance="secondary" onClick={() => handleSelection(false)}>
              {doNotCombineLabel}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
};
