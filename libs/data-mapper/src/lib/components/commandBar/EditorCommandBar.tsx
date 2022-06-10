import type { JsonInputStyle } from '../../models';
import {
  discardCurrentState,
  publishState,
  redoState,
  runTest,
  saveState,
  showConfig,
  showFeedback,
  showSearchbar,
  showTutorial,
  undoState,
} from './helpers';
import { CommandBar, initializeIcons, ContextualMenuItemType, PrimaryButton } from '@fluentui/react';
import type { IComponentAs, ICommandBarItemProps } from '@fluentui/react';
import { useCallback, useState } from 'react';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

export const EditorCommandBar = () => {
  return <EditorCommandBarWrapper />;
};

initializeIcons();

interface DataMapState {
  time: string;
  mapData?: JsonInputStyle;
}

interface EditorCommandBarButtonsProps {
  onSaveClick: () => void;
  onUndoClick: () => void;
  onRedoClick: () => void;
  showUndo: boolean;
  onUndoRedoChange: (showUndo: boolean) => void;
  onDiscardClick: () => void;
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
  showUndo,
  onUndoRedoChange,
  onDiscardClick,
  stateStack,
  stateStackInd,
  onStateStackChange,
  onTestClick,
  onConfigClick,
  onTutorialClick,
  onFeedbackClick,
  onSearchClick,
  onPublishClick,
}) => {
  const intl = useIntl();

  const PublishButtonWrapper: IComponentAs<ICommandBarItemProps> = () => (
    <PrimaryButton style={{ alignSelf: 'center', marginRight: '5%' }} text={Resources.PUBLISH} onClick={onPublishClick} />
  );

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
  };

  const items: ICommandBarItemProps[] = [
    {
      key: 'save',
      text: Resources.SAVE,
      ariaLabel: Resources.SAVE,
      iconProps: { iconName: 'Save' },
      onClick: onSaveClick,
    },
    {
      key: 'undo-redo',
      text: showUndo ? Resources.UNDO : Resources.REDO,
      ariaLabel: showUndo ? Resources.UNDO : Resources.REDO,
      iconProps: { iconName: showUndo ? 'Undo' : 'Redo' },
      split: false,
      subMenuProps: {
        items: [
          {
            key: 'undo',
            text: Resources.UNDO,
            iconProps: { iconName: 'Undo' },
            secondaryText: Resources.CTR_Z,
            onClick: () => {
              if (!showUndo) onUndoRedoChange(showUndo);
              onUndoClick();
            },
          },
          {
            key: 'redo',
            text: Resources.REDO,
            iconProps: { iconName: 'Redo' },
            secondaryText: Resources.CTR_Y,
            onClick: () => {
              if (showUndo) onUndoRedoChange(showUndo);
              onRedoClick();
            },
          },
        ],
      },
      onClick: () => console.log('Undo-redo button clicked'),
    },
    { key: 'discard', text: Resources.DISCARD, ariaLabel: Resources.DISCARD, iconProps: { iconName: 'Cancel' }, onClick: onDiscardClick },
    {
      ...divider,
      key: 'discard-test-divider',
    },
    {
      key: 'test',
      text: Resources.RUN_TEST,
      ariaLabel: Resources.RUN_TEST,
      split: true,
      iconProps: { iconName: 'Play' },
      onClick: onTestClick,
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
      onClick: onConfigClick,
    },
    {
      key: 'tour_tutorial',
      text: Resources.TOUR_TUTORIAL,
      ariaLabel: Resources.TOUR_TUTORIAL,
      iconProps: { iconName: 'Help' },
      onClick: onTutorialClick,
    },
    {
      key: 'feedback',
      text: Resources.GIVE_FEEDBACK,
      ariaLabel: Resources.GIVE_FEEDBACK,
      iconProps: { iconName: 'Feedback' },
      onClick: onFeedbackClick,
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
    },
    {
      key: 'publish',
      text: Resources.PUBLISH,
      ariaLabel: Resources.PUBLISH,
      commandBarButtonAs: PublishButtonWrapper,
    },
  ];

  return <CommandBar items={items} farItems={farItems} ariaLabel="Use left and right arrow keys to navigate between commands" />;
};

const EditorCommandBarWrapper: FunctionComponent = () => {
  const intl = useIntl();

  const [showUndo, setShowUndo] = useState(true);
  const onUndoRedoChange = useCallback((showUndo) => setShowUndo(!showUndo), []);

  const [stateStackInd, setStateStackInd] = useState(0);
  const onStateStackChange = useCallback((stateStackInd) => setStateStackInd(stateStackInd), []);

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
      onSaveClick={saveState}
      onUndoClick={undoState}
      onRedoClick={redoState}
      showUndo={showUndo}
      onUndoRedoChange={onUndoRedoChange}
      onDiscardClick={discardCurrentState}
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
