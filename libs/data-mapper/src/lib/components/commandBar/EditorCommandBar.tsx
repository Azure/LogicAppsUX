import { discardDataMap } from '../../core/state/DataMapSlice';
import { closeModal, WarningModalState, openDiscardWarningModal } from '../../core/state/ModalSlice';
import { openDefaultConfigPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { IButtonStyles, ICommandBarItemProps } from '@fluentui/react';
import { CommandBar, ContextualMenuItemType } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import { useCallback, useEffect, useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

const cmdBarStyles = {
  root: {
    backgroundColor: tokens.colorNeutralBackground4,
    marginBottom: '8px',
    borderBottom: 'none',
  },
  primarySet: {
    backgroundColor: tokens.colorNeutralBackground4,
  },
  secondarySet: {
    backgroundColor: tokens.colorNeutralBackground4,
  },
};

const cmdBarItemBgStyles = {
  style: {
    backgroundColor: tokens.colorNeutralBackground4,
  },
};

const cmdBarButtonStyles: IButtonStyles = {
  label: {
    color: tokens.colorNeutralForeground1,
  },
  icon: {
    color: tokens.colorBrandForeground1,
  },
  splitButtonDivider: {
    color: tokens.colorNeutralStroke1,
  },
  labelDisabled: {
    color: tokens.colorNeutralForegroundDisabled,
  },
  iconDisabled: {
    color: tokens.colorNeutralForegroundDisabled,
  },
};

const divider: ICommandBarItemProps = {
  key: 'global-divider',
  itemType: ContextualMenuItemType.Divider,
  iconProps: {
    iconName: 'Separator',
  },
  iconOnly: true,
  disabled: true,
  buttonStyles: {
    root: {
      width: 10,
      minWidth: 'unset',
    },
    ...cmdBarButtonStyles,
  },
  ...cmdBarItemBgStyles,
};

export interface EditorCommandBarProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
  onTestClick: () => void;
}

export const EditorCommandBar = (props: EditorCommandBarProps) => {
  const { onSaveClick, onUndoClick, onRedoClick, onTestClick } = props;
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
      SAVE: intl.formatMessage({
        defaultMessage: 'Save',
        description: 'Button text for save the changes',
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
    }),
    [intl]
  );

  const items: ICommandBarItemProps[] = useMemo(
    () => [
      {
        key: 'save',
        text: Resources.SAVE,
        ariaLabel: Resources.SAVE,
        iconProps: { iconName: 'Save' },
        onClick: onSaveClick,
        disabled: !sourceSchema || !targetSchema ? true : !isStateDirty,
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
      {
        key: 'undo',
        text: Resources.UNDO,
        ariaLabel: Resources.UNDO,
        iconProps: { iconName: 'Undo' },
        onClick: onUndoClick,
        disabled: undoStack.length === 0,
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
      {
        key: 'redo',
        text: Resources.REDO,
        ariaLabel: Resources.REDO,
        iconProps: { iconName: 'Redo' },
        onClick: onRedoClick,
        disabled: redoStack.length === 0,
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
      {
        key: 'discard',
        text: Resources.DISCARD,
        ariaLabel: Resources.DISCARD,
        iconProps: { iconName: 'Cancel' },
        onClick: triggerDiscardWarningModal,
        disabled: !isStateDirty,
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
      {
        ...divider,
        key: 'discard-test-divider',
      },
      {
        key: 'test',
        text: Resources.RUN_TEST,
        ariaLabel: Resources.RUN_TEST,
        iconProps: { iconName: 'Play' },
        onClick: onTestClick,
        disabled: !xsltFilename,
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
      {
        ...divider,
        key: 'test-config-divider',
      },
      {
        key: 'configuration',
        text: Resources.CONFIGURATION,
        ariaLabel: Resources.CONFIGURATION,
        iconProps: { iconName: 'Settings' },
        onClick: () => {
          dispatch(openDefaultConfigPanelView());
        },
        buttonStyles: cmdBarButtonStyles,
        ...cmdBarItemBgStyles,
      },
    ],
    [
      Resources,
      triggerDiscardWarningModal,
      dispatch,
      isStateDirty,
      onRedoClick,
      onSaveClick,
      onTestClick,
      onUndoClick,
      redoStack,
      undoStack,
      sourceSchema,
      targetSchema,
      xsltFilename,
    ]
  );

  return <CommandBar items={items} ariaLabel="Use left and right arrow keys to navigate between commands" styles={cmdBarStyles} />;
};
