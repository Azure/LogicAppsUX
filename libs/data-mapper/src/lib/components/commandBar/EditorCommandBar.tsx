import { discardDataMap } from '../../core/state/DataMapSlice';
import { closeModal, openDiscardWarningModal, WarningModalState } from '../../core/state/ModalSlice';
import { openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { makeStyles, shorthands, ToggleButton, Toolbar, ToolbarButton, ToolbarDivider, ToolbarGroup } from '@fluentui/react-components';
import {
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  Dismiss20Regular,
  Globe20Regular,
  Organization20Regular,
  Play20Regular,
  Save20Regular,
  ArrowExportLtr20Regular,
  Settings20Regular,
} from '@fluentui/react-icons';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export interface EditorCommandBarProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
  onTestClick: () => void;
  showGlobalView: boolean;
  setShowGlobalView: (showGlobalView: boolean) => void;
  onGenerateClick: () => void;
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
  const { onSaveClick, onUndoClick, onRedoClick, onTestClick, showGlobalView, setShowGlobalView, onGenerateClick } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isStateDirty = useSelector((state: RootState) => state.dataMap.present.isDirty);
  const undoStack = useSelector((state: RootState) => state.dataMap.past);
  const redoStack = useSelector((state: RootState) => state.dataMap.future);
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
      dispatch(discardDataMap());
      dispatch(closeModal());
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
      GENERATE: intl.formatMessage({
        defaultMessage: 'Generate XSLT',
        id: 'ylfgv1',
        description: 'Button text for generate the map xslt',
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
      CTR_Z: intl.formatMessage({
        defaultMessage: 'Ctrl + Z',
        id: 'xFQXAI',
        description: 'Button text for the control-Z button combination to undo the last action',
      }),
      CTR_Y: intl.formatMessage({
        defaultMessage: 'Ctrl + Y',
        id: 'DysO/Q',
        description: 'Button text for the control-Y button combination to redo the last undone action',
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
      SETTINGS: intl.formatMessage({
        defaultMessage: 'Settings',
        id: 'E7NzDN',
        description: 'Button text for opening the settings',
      }),
      TOUR_TUTORIAL: intl.formatMessage({
        defaultMessage: 'Tour',
        id: '4aaixN',
        description: 'Button text for tour and tutorial',
      }),
      GIVE_FEEDBACK: intl.formatMessage({
        defaultMessage: 'Give feedback',
        id: 'TEN+cR',
        description: 'Button text for submitting feedback',
      }),
      GLOBAL_SEARCH: intl.formatMessage({
        defaultMessage: 'Global search',
        id: '23uZn1',
        description: 'Button text for global search',
      }),
      PUBLISH: intl.formatMessage({
        defaultMessage: 'Publish',
        id: 'g4igOR',
        description: 'Button text for publish',
      }),
      GLOBAL_VIEW: intl.formatMessage({
        defaultMessage: 'Overview',
        id: '+M72+a',
        description: 'Button text for whole overview',
      }),
      CANVAS: intl.formatMessage({
        defaultMessage: 'Canvas',
        id: 'ww1mN/',
        description: 'Button text for showing the canvas view',
      }),
      DIVIDER: intl.formatMessage({
        defaultMessage: 'Divider',
        id: '3cZZKj',
        description: 'Aria label for divider',
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
        <ToolbarButton
          aria-label={Resources.GENERATE}
          icon={<ArrowExportLtr20Regular />}
          disabled={!bothSchemasDefined}
          onClick={onGenerateClick}
        >
          {Resources.GENERATE}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.RUN_TEST} icon={<Play20Regular />} disabled={!xsltFilename} onClick={onTestClick}>
          {Resources.RUN_TEST}
        </ToolbarButton>
        <ToolbarDivider className={toolbarStyles.divider} />
        <ToolbarButton aria-label={Resources.UNDO} icon={<ArrowUndo20Regular />} disabled={undoStack.length === 0} onClick={onUndoClick}>
          {Resources.UNDO}
        </ToolbarButton>
        <ToolbarButton aria-label={Resources.REDO} icon={<ArrowRedo20Regular />} disabled={redoStack.length === 0} onClick={onRedoClick}>
          {Resources.REDO}
        </ToolbarButton>
        <ToolbarButton
          aria-label={Resources.DISCARD}
          icon={<Dismiss20Regular />}
          disabled={!isStateDirty}
          onClick={triggerDiscardWarningModal}
        >
          {Resources.DISCARD}
        </ToolbarButton>
        <ToolbarDivider className={toolbarStyles.divider} />
        <ToggleButton
          className={showGlobalView ? toolbarStyles.toggleButton : toolbarStyles.toggleButtonSelected}
          aria-label={Resources.CANVAS}
          icon={<Organization20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            setShowGlobalView(false);
          }}
          checked={!showGlobalView}
        >
          {Resources.CANVAS}
        </ToggleButton>
        <ToggleButton
          className={showGlobalView ? toolbarStyles.toggleButtonSelected : toolbarStyles.toggleButton}
          aria-label={Resources.GLOBAL_VIEW}
          icon={<Globe20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            setShowGlobalView(true);
          }}
          checked={showGlobalView}
        >
          {Resources.GLOBAL_VIEW}
        </ToggleButton>
        <ToolbarDivider className={toolbarStyles.divider} />
        <ToolbarButton
          aria-label={Resources.SETTINGS}
          icon={<Settings20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            dispatch(openDefaultConfigPanelView());

            LogService.log(LogCategory.DefaultConfigView, 'openOrCloseConfigPanel', {
              message: 'Opened configuration panel',
            });
          }}
        >
          {Resources.SETTINGS}
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
};
