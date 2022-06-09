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
  const PublishButtonWrapper: IComponentAs<ICommandBarItemProps> = () => (
    <PrimaryButton style={{ alignSelf: 'center', marginRight: '5%' }} text="Publish" onClick={onPublishClick} />
  );

  const items: ICommandBarItemProps[] = [
    {
      key: 'save',
      text: 'Save',
      iconProps: { iconName: 'Save' },
      onClick: onSaveClick,
    },
    {
      key: 'undo-redo',
      text: showUndo ? 'Undo' : 'Redo',
      iconProps: { iconName: showUndo ? 'Undo' : 'Redo' },
      split: false,
      subMenuProps: {
        items: [
          {
            key: 'undo',
            text: 'Undo',
            iconProps: { iconName: 'Undo' },
            secondaryText: 'Ctrl + Z',
            onClick: () => {
              if (!showUndo) onUndoRedoChange(showUndo);
              onUndoClick();
            },
          },
          {
            key: 'redo',
            text: 'Redo',
            iconProps: { iconName: 'Redo' },
            secondaryText: 'Ctrl + Y',
            onClick: () => {
              if (showUndo) onUndoRedoChange(showUndo);
              onRedoClick();
            },
          },
        ],
      },
      onClick: () => console.log('Undo-redo button clicked'),
    },
    { key: 'discard', text: 'Discard', iconProps: { iconName: 'Cancel' }, onClick: onDiscardClick },
    {
      key: 'divider-1',
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
    },
    { key: 'test', text: 'Test', split: true, iconProps: { iconName: 'Play' }, onClick: onTestClick },
    {
      key: 'divider-2',
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
    },
    {
      key: 'configuration',
      text: 'Configuration',
      iconProps: { iconName: 'Settings' },
      onClick: onConfigClick,
    },
    {
      key: 'tour_tutorial',
      text: 'Tour / Tutorial',
      iconProps: { iconName: 'Help' },
      onClick: onTutorialClick,
    },
    {
      key: 'feedback',
      text: 'Give feedback',
      iconProps: { iconName: 'Feedback' },
      onClick: onFeedbackClick,
    },
  ];

  const farItems: ICommandBarItemProps[] = [
    {
      key: 'tile',
      text: 'Global Search',
      ariaLabel: 'Global Search',
      iconOnly: true,
      iconProps: { iconName: 'Search' },
      onClick: onSearchClick,
    },
    {
      key: 'divider',
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
    },
    {
      key: 'current-status',
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
      disabled: true,
      commandBarButtonAs: PublishButtonWrapper,
    },
  ];

  return <CommandBar items={items} farItems={farItems} ariaLabel="Use left and right arrow keys to navigate between commands" />;
};

const EditorCommandBarWrapper: FunctionComponent = () => {
  const [showUndo, setShowUndo] = useState(true);
  const onUndoRedoChange = useCallback((showUndo) => setShowUndo(!showUndo), []);

  const [stateStackInd, setStateStackInd] = useState(0);
  const onStateStackChange = useCallback((stateStackInd) => setStateStackInd(stateStackInd), []);

  const exampleStateStack: DataMapState[] = [
    { time: '5/31/2022 3:14 PM' },
    { time: '5/31/2022 2:14 PM' },
    { time: '5/31/2022 1:14 PM' },
    { time: '5/31/2022 12:14 PM' },
  ];

  exampleStateStack.push({ time: 'Show all versions' });

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
