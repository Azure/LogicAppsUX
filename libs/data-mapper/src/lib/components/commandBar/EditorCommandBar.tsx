import { discardDataMap } from '../../core/state/DataMapSlice';
import { closeAllWarning, openDiscardWarning, removeOkClicked, WarningModalState } from '../../core/state/ModalSlice';
import { openDefaultConfigPanel } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import type { DataMap } from '../../models';
import { publishState, runTest, showConfig, showFeedback, showSearchbar, showTutorial } from './helpers';
import type { IButtonStyles, ICommandBarItemProps, IComponentAs, IContextualMenuStyles } from '@fluentui/react';
import { CommandBar, ContextualMenuItemType, PrimaryButton } from '@fluentui/react';
import { tokens } from '@fluentui/react-components';
import { useBoolean } from '@fluentui/react-hooks';
import type { FunctionComponent } from 'react';
import { useCallback, useEffect, useState } from 'react';
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

export interface EditorCommandBarProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
}

export const EditorCommandBar: FunctionComponent<EditorCommandBarProps> = ({ onSaveClick, onUndoClick, onRedoClick }) => {
  return <EditorCommandBarWrapper onSaveClick={onSaveClick} onUndoClick={onUndoClick} onRedoClick={onRedoClick} />;
};

interface DataMapState {
  time: string;
  mapData?: DataMap;
}

interface EditorCommandBarButtonsProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
  stateStack: DataMapState[];
  stateStackInd: number;
  onStateStackChange: (stateStackInd: number) => void;
  onTestClick: () => void;
  onConfigClick: () => void;
  onTutorialClick: () => void;
  onFeedbackClick: () => void;
  onSearchClick: () => void;
  onPublishClick: () => void;
}

const EditorCommandBarButtons: FunctionComponent<EditorCommandBarButtonsProps> = ({
  onSaveClick,
  onUndoClick,
  onRedoClick,
  stateStack,
  stateStackInd,
  onStateStackChange,
  onTestClick,
  onTutorialClick,
  onFeedbackClick,
  onSearchClick,
  onPublishClick,
}) => {
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

  const PublishButtonWrapper: IComponentAs<ICommandBarItemProps> = () => (
    <PrimaryButton style={{ alignSelf: 'center', marginRight: '5%' }} text={Resources.PUBLISH} onClick={onPublishClick} />
  );

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

  const contextualMenuStyles: IContextualMenuStyles = {
    container: {},
    header: {},
    list: {},
    root: {},
    subComponentStyles: {
      callout: {},
      menuItem: {
        label: {
          color: tokens.colorNeutralForeground1,
        },
        secondaryText: {
          color: tokens.colorNeutralForeground1,
        },
        subMenuIcon: {
          color: tokens.colorNeutralForeground1,
        },
        icon: {
          color: tokens.colorNeutralForeground1,
        },
        iconDisabled: {
          color: tokens.colorNeutralForegroundDisabled,
        },
        labelDisabled: {
          color: tokens.colorNeutralForegroundDisabled,
        },
      },
    },
    title: {},
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

  const undoRedoOnClick = (performUndo: boolean) => {
    if (performUndo) {
      setShowUndo();
      onUndoClick();
    } else {
      setShowRedo();
      onRedoClick();
    }
  };

  const items: ICommandBarItemProps[] = [
    {
      key: 'save',
      text: Resources.SAVE,
      ariaLabel: Resources.SAVE,
      iconProps: { iconName: 'Save' },
      onClick: onSaveClick,
      disabled: !isStateDirty,
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
    {
      key: 'undo-redo',
      text: showUndo ? Resources.UNDO : Resources.REDO,
      ariaLabel: showUndo ? Resources.UNDO : Resources.REDO,
      iconProps: { iconName: showUndo ? 'Undo' : 'Redo' },
      split: true,
      subMenuProps: {
        styles: contextualMenuStyles,
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
        splitButtonMenuIcon: {
          color: tokens.colorNeutralForeground2,
        },
        splitButtonMenuButtonExpanded: {
          backgroundColor: tokens.colorNeutralBackground4,
        },
        splitButtonMenuButtonChecked: {
          color: tokens.colorNeutralForeground2,
        },
        splitButtonDividerDisabled: {
          color: tokens.colorNeutralForegroundDisabled,
        },
        splitButtonMenuIconDisabled: {
          color: tokens.colorNeutralForegroundDisabled,
        },
        ...cmdBarButtonStyles,
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
        dispatch(openDefaultConfigPanel());
      },
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
    {
      key: 'tour_tutorial',
      text: Resources.TOUR_TUTORIAL,
      ariaLabel: Resources.TOUR_TUTORIAL,
      iconProps: { iconName: 'Help' },
      onClick: onTutorialClick,
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
    {
      key: 'feedback',
      text: Resources.GIVE_FEEDBACK,
      ariaLabel: Resources.GIVE_FEEDBACK,
      iconProps: { iconName: 'Feedback' },
      onClick: onFeedbackClick,
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'search',
      text: Resources.GLOBAL_SEARCH,
      ariaLabel: Resources.GLOBAL_SEARCH,
      iconOnly: true,
      iconProps: { iconName: 'Search' },
      onClick: onSearchClick,
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
    {
      ...divider,
      key: 'search-version-divider',
    },
    {
      key: 'version',
      text: stateStackInd === 0 ? 'Current (Last save: ... mins ago)' : stateStack[stateStackInd].time,
      ariaLabel: 'version',
      split: false,
      subMenuProps: {
        items: stateStack.map((state, ind) => {
          return {
            key: state.time,
            text: ind === 0 ? 'Current (Last save: ... mins ago)' : state.time,
            disabled: stateStackInd === ind,
            onClick: () => onStateStackChange(ind),
          };
        }),
      },
      buttonStyles: cmdBarButtonStyles,
      ...cmdBarItemBgStyles,
    },
    {
      key: 'publish',
      text: Resources.PUBLISH,
      ariaLabel: Resources.PUBLISH,
      commandBarButtonAs: PublishButtonWrapper,
    },
  ];

  return (
    <CommandBar
      items={items}
      farItems={farItems}
      ariaLabel="Use left and right arrow keys to navigate between commands"
      styles={cmdBarStyles}
    />
  );
};

const EditorCommandBarWrapper: FunctionComponent<EditorCommandBarProps> = ({ onSaveClick, onUndoClick, onRedoClick }) => {
  const intl = useIntl();

  const [stateStackInd, setStateStackInd] = useState(0);
  const onStateStackChange = useCallback((stateStackInd: number) => setStateStackInd(stateStackInd), []);

  // This is a placeholder example - TODO: when save/discard is implemented, replace this (14681794)
  const exampleStateStack: DataMapState[] = [
    { time: '5/31/2022 3:14 PM' },
    { time: '5/31/2022 2:14 PM' },
    { time: '5/31/2022 1:14 PM' },
    { time: '5/31/2022 12:14 PM' },
  ];

  exampleStateStack.push({
    time: intl.formatMessage({
      defaultMessage: 'Show all versions',
      description: 'Dropdown text for show all version histories',
    }),
  });

  return (
    <EditorCommandBarButtons
      onSaveClick={onSaveClick}
      onUndoClick={onUndoClick}
      onRedoClick={onRedoClick}
      stateStack={exampleStateStack}
      stateStackInd={stateStackInd}
      onStateStackChange={onStateStackChange}
      onTestClick={runTest}
      onConfigClick={showConfig}
      onTutorialClick={showTutorial}
      onFeedbackClick={showFeedback}
      onSearchClick={showSearchbar}
      onPublishClick={publishState}
    />
  );
};
