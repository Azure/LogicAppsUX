import { discardDataMap } from '../../core/state/DataMapSlice';
import { closeAllWarning, openDiscardWarning, removeOkClicked, WarningModalState } from '../../core/state/ModalSlice';
import { openDefaultConfigPanel } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { ICommandBarItemProps } from '@fluentui/react';
import { CommandBar, ContextualMenuItemType } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import { useEffect } from 'react';
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
  const isUndoStackEmpty = undoStack.length === 0;
  const redoStack = useSelector((state: RootState) => state.dataMap.redoStack);
  const isRedoStackEmpty = redoStack.length === 0;
  const isDiscardConfirmed = useSelector(
    (state: RootState) => state.modal.warningModalType === WarningModalState.DiscardWarning && state.modal.isOkClicked
  );

  const [showUndo, { setTrue: setShowUndo, setFalse: setShowRedo }] = useBoolean(true);

  const undoRedoOnClick = (performUndo: boolean) => {
    if (performUndo) {
      setShowUndo();
      onUndoClick();
    } else {
      setShowRedo();
      onRedoClick();
    }
  };

  useEffect(() => {
    if (isDiscardConfirmed) {
      dispatch(removeOkClicked());
      dispatch(discardDataMap());
      dispatch(closeAllWarning());
    }
  }, [dispatch, isDiscardConfirmed]);

  const Resources = {
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
      defaultMessage: 'Configuration',
      description: 'Button text for opening the configuration',
    }),
    TOUR_TUTORIAL: intl.formatMessage({
      defaultMessage: 'Tour/Tutorial',
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
    },
    ...cmdBarItemBgStyles,
  };

  const items: ICommandBarItemProps[] = [
    {
      key: 'save',
      text: Resources.SAVE,
      ariaLabel: Resources.SAVE,
      iconProps: { iconName: 'Save' },
      onClick: onSaveClick,
      disabled: !isStateDirty,
      ...cmdBarItemBgStyles,
    },
    {
      key: 'undo-redo',
      text: showUndo ? Resources.UNDO : Resources.REDO,
      ariaLabel: showUndo ? Resources.UNDO : Resources.REDO,
      iconProps: { iconName: showUndo ? 'Undo' : 'Redo' },
      split: true,
      subMenuProps: {
        items: [
          {
            key: 'undo',
            text: Resources.UNDO,
            iconProps: { iconName: 'Undo' },
            secondaryText: Resources.CTR_Z,
            onClick: () => undoRedoOnClick(true),
            disabled: isUndoStackEmpty,
          },
          {
            key: 'redo',
            text: Resources.REDO,
            iconProps: { iconName: 'Redo' },
            secondaryText: Resources.CTR_Y,
            onClick: () => undoRedoOnClick(false),
            disabled: isRedoStackEmpty,
          },
        ],
      },
      onClick: () => undoRedoOnClick(showUndo),
      primaryDisabled: showUndo ? isUndoStackEmpty : isRedoStackEmpty,
      ...cmdBarItemBgStyles,
      buttonStyles: {
        splitButtonMenuButton: {
          backgroundColor: tokens.colorNeutralBackground4,
        },
      },
    },
    {
      key: 'discard',
      text: Resources.DISCARD,
      ariaLabel: Resources.DISCARD,
      iconProps: { iconName: 'Cancel' },
      onClick: () => {
        dispatch(openDiscardWarning());
      },
      disabled: !isStateDirty,
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
        dispatch(openDefaultConfigPanel());
      },
      ...cmdBarItemBgStyles,
    },
  ];

  return <CommandBar items={items} ariaLabel="Use left and right arrow keys to navigate between commands" styles={cmdBarStyles} />;
};
