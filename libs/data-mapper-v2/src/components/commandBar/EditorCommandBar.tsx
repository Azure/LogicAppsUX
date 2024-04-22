import { WarningModalState, openDiscardWarningModal } from '../../core/state/ModalSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { makeStyles, shorthands, Toolbar, ToolbarButton, ToolbarGroup } from '@fluentui/react-components';
import { ArrowUndo20Regular, Dismiss20Regular, Play20Regular, Save20Regular } from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface EditorCommandBarProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onTestClick: () => void;
}

const useStyles = makeStyles({
  toolbar: {
    justifyContent: 'space-between',
  },
  button: {
    ...shorthands.padding('5px', '0px'),
    minWidth: '80px',
  },
  toggleButton: {
    ...shorthands.border('0'),
    ...shorthands.borderStyle('none'),
    backgroundColor: 'transparent',
  },
  toggleButtonSelected: {
    ...shorthands.border('0'),
    ...shorthands.borderStyle('none'),
  },
  divider: {
    maxHeight: '25px',
    marginTop: '4px',
  },
  toolbarGroup: {
    display: 'flex',
  },
});

export const EditorCommandBar = (props: EditorCommandBarProps) => {
  const { onSaveClick, onUndoClick, onTestClick } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const undoStack = useSelector((state: RootState) => state.dataMap.past);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.targetSchema);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.xsltFilename);
  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );

  const triggerDiscardWarningModal = useCallback(() => {
    dispatch(openDiscardWarningModal());
  }, [dispatch]);

  // Tracks modal (confirmation) state
  useEffect(() => {
    if (isDiscardConfirmed) {
      console.log('Discard confirmed');
      //   dispatch(discardDataMap());
      //   dispatch(closeModal());
    }
  }, [dispatch, isDiscardConfirmed]);

  const Resources = useMemo(
    () => ({
      COMMAND_BAR_ARIA: intl.formatMessage({
        defaultMessage: 'Use left and right arrow keys to navigate between commands',
        id: 'rd6fai',
        description: 'Aria describing the way to control the keyboard navigation',
      }),
      SAVE: intl.formatMessage({
        defaultMessage: 'Save',
        id: 'Sh10cw',
        description: 'Button text for save the changes',
      }),
      UNDO: intl.formatMessage({
        defaultMessage: 'Undo',
        id: 'r43nMc',
        description: 'Button text for undo the last action',
      }),
      REDO: intl.formatMessage({
        defaultMessage: 'Redo',
        id: 'i1cwra',
        description: 'Button text for redo the last undone action',
      }),
      DISCARD: intl.formatMessage({
        defaultMessage: 'Discard',
        id: 'Q4TUFX',
        description: 'Button text for discard the unsaved changes',
      }),
      RUN_TEST: intl.formatMessage({
        defaultMessage: 'Test',
        id: 'iy8rNf',
        description: 'Button text for running test',
      }),
    }),
    [intl]
  );

  const toolbarStyles = useStyles();
  const bothSchemasDefined = sourceSchema && targetSchema;

  return (
    <Toolbar size="medium" aria-label={Resources.COMMAND_BAR_ARIA} className={toolbarStyles.toolbar}>
      <ToolbarGroup className={toolbarStyles.toolbarGroup}>
        <ToolbarButton
          aria-label={Resources.SAVE}
          icon={<Save20Regular />}
          disabled={!bothSchemasDefined || !isStateDirty}
          onClick={onSaveClick}
          className={toolbarStyles.button}
        >
          {Resources.SAVE}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.UNDO} icon={<ArrowUndo20Regular />} disabled={undoStack.length === 0} onClick={onUndoClick}>
          {Resources.UNDO}
        </ToolbarButton>
        <ToolbarButton
          aria-label={Resources.DISCARD}
          icon={<Dismiss20Regular />}
          disabled={!isStateDirty}
          onClick={triggerDiscardWarningModal}
        >
          {Resources.DISCARD}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.RUN_TEST} icon={<Play20Regular />} disabled={!xsltFilename} onClick={onTestClick}>
          {Resources.RUN_TEST}
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
};
