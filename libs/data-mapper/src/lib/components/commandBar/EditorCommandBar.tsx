import { discardDataMap } from '../../core/state/DataMapSlice';
import { closeModal, openDiscardWarningModal, WarningModalState } from '../../core/state/ModalSlice';
import { openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import { makeStyles, shorthands, Toolbar, ToolbarButton, ToolbarDivider, ToolbarGroup } from '@fluentui/react-components';
import {
  ArrowRedo20Regular,
  ArrowUndo20Regular,
  Dismiss20Regular,
  Globe20Regular,
  OrganizationHorizontal20Regular,
  Play20Regular,
  Save20Regular,
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
  showMapOverview: boolean;
  setShowMapOverview: (showMapOverview: boolean) => void;
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
});

export const EditorCommandBar = (props: EditorCommandBarProps) => {
  const {
    onSaveClick,
    onUndoClick,
    onRedoClick,
    onTestClick,
    showMapOverview,
    setShowMapOverview,
    showGlobalView,
    setShowGlobalView,
    onGenerateClick,
  } = props;
  const intl = useIntl();
  const dispatch = useDispatch<AppDispatch>();

  const isStateDirty = useSelector((state: RootState) => state.dataMap.isDirty);
  const undoStack = useSelector((state: RootState) => state.dataMap.undoStack);
  const redoStack = useSelector((state: RootState) => state.dataMap.redoStack);
  const sourceSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.sourceSchema);
  const targetSchema = useSelector((state: RootState) => state.dataMap.curDataMapOperation.targetSchema);
  const xsltFilename = useSelector((state: RootState) => state.dataMap.curDataMapOperation.xsltFilename);
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
        description: 'Aria describing the way to control the keyboard navigation',
      }),
      SAVE: intl.formatMessage({
        defaultMessage: 'Save',
        description: 'Button text for save the changes',
      }),
      GENERATE: intl.formatMessage({
        defaultMessage: 'Generate',
        description: 'Button text for generate the map',
      }),
      UNDO: intl.formatMessage({
        defaultMessage: 'Undo',
        description: 'Button text for undo the last action',
      }),
      REDO: intl.formatMessage({
        defaultMessage: 'Redo',
        description: 'Button text for redo the last undone action',
      }),
      CTR_Z: intl.formatMessage({
        defaultMessage: 'Ctrl + Z',
        description: 'Button text for the control-Z button combination to undo the last action',
      }),
      CTR_Y: intl.formatMessage({
        defaultMessage: 'Ctrl + Y',
        description: 'Button text for the control-Y button combination to redo the last undone action',
      }),
      DISCARD: intl.formatMessage({
        defaultMessage: 'Discard',
        description: 'Button text for discard the unsaved changes',
      }),
      RUN_TEST: intl.formatMessage({
        defaultMessage: 'Test',
        description: 'Button text for running test',
      }),
      CONFIGURATION: intl.formatMessage({
        defaultMessage: 'Configure',
        description: 'Button text for opening the configuration',
      }),
      TOUR_TUTORIAL: intl.formatMessage({
        defaultMessage: 'Tour',
        description: 'Button text for tour and tutorial',
      }),
      GIVE_FEEDBACK: intl.formatMessage({
        defaultMessage: 'Give feedback',
        description: 'Button text for submitting feedback',
      }),
      GLOBAL_SEARCH: intl.formatMessage({
        defaultMessage: 'Global search',
        description: 'Button text for global search',
      }),
      PUBLISH: intl.formatMessage({
        defaultMessage: 'Publish',
        description: 'Button text for publish',
      }),
      MAP_OVERVIEW: intl.formatMessage({
        defaultMessage: 'Overview',
        description: 'Button text for overview',
      }),
      GLOBAL_VIEW: intl.formatMessage({
        defaultMessage: 'Global view',
        description: 'Button text for whole overview',
      }),
      RETURN: intl.formatMessage({
        defaultMessage: 'Return',
        description: 'Button text for returning to the canvas',
      }),
      DIVIDER: intl.formatMessage({
        defaultMessage: 'Divider',
        description: 'Aria label for divider',
      }),
    }),
    [intl]
  );

  const farGroupStyles = useStyles();
  const bothSchemasDefined = sourceSchema && targetSchema;

  return (
    <Toolbar size="medium" aria-label={Resources.COMMAND_BAR_ARIA} className={farGroupStyles.toolbar}>
      <ToolbarGroup>
        <ToolbarButton
          aria-label={Resources.SAVE}
          icon={<Save20Regular />}
          disabled={!bothSchemasDefined || !isStateDirty}
          onClick={onSaveClick}
          className={farGroupStyles.button}
        >
          {Resources.SAVE}
        </ToolbarButton>
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
        <ToolbarDivider />
        <ToolbarButton aria-label={Resources.RUN_TEST} icon={<Play20Regular />} disabled={!xsltFilename} onClick={onTestClick}>
          {Resources.RUN_TEST}
        </ToolbarButton>
        <ToolbarButton
          aria-label={showMapOverview ? Resources.RETURN : Resources.MAP_OVERVIEW}
          icon={<OrganizationHorizontal20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            setShowMapOverview(!showMapOverview);
            setShowGlobalView(false);
          }}
        >
          {showMapOverview ? Resources.RETURN : Resources.MAP_OVERVIEW}
        </ToolbarButton>
        <ToolbarButton
          aria-label={showGlobalView ? Resources.RETURN : Resources.GLOBAL_VIEW}
          icon={<Globe20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            setShowMapOverview(false);
            setShowGlobalView(!showGlobalView);
          }}
        >
          {showGlobalView ? Resources.RETURN : Resources.GLOBAL_VIEW}
        </ToolbarButton>
        <ToolbarDivider />
        <ToolbarButton
          aria-label={Resources.CONFIGURATION}
          icon={<Settings20Regular />}
          disabled={!bothSchemasDefined}
          onClick={() => {
            dispatch(openDefaultConfigPanelView());

            LogService.log(LogCategory.DefaultConfigView, 'openOrCloseConfigPanel', {
              message: 'Opened configuration panel',
            });
          }}
        >
          {Resources.CONFIGURATION}
        </ToolbarButton>
      </ToolbarGroup>
      <ToolbarGroup style={{ marginRight: '40px' }}>
        <ToolbarButton aria-label={Resources.GENERATE} appearance="primary" disabled={!bothSchemasDefined} onClick={onGenerateClick}>
          {Resources.GENERATE}
        </ToolbarButton>
      </ToolbarGroup>
    </Toolbar>
  );
};
