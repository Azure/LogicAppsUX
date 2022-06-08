import {
  CommandBar,
  DirectionalHint,
  Coachmark,
  TeachingBubbleContent,
  CommandBarButton,
  ThemeProvider,
  initializeIcons,
  ContextualMenuItemType,
  VerticalDivider,
  IconNames,
  PrimaryButton,
} from '@fluentui/react';
import type { ICommandBarItemProps, IComponentAsProps, IComponentAs, IButtonProps } from '@fluentui/react';
import { useCallback, useMemo, useRef, useState } from 'react';
import type { FunctionComponent } from 'react';

export const EditorCommandBar = () => {
  return <IndividualCommandBarButtonAsExampleWrapper />;
};

// Initialize icons in case this example uses them
initializeIcons();

interface IIndividualCommandBarButtonAsExampleProps {
  onDismissCoachmark: () => void;
  isCoachmarkVisible: boolean;
}

interface ICoachmarkCommandBarButtonProps extends IComponentAsProps<ICommandBarItemProps> {
  onDismiss: () => void;
  isCoachmarkVisible?: boolean;
}

/** Command bar button with a coachmark and teaching bubble */
const CoachmarkCommandBarButton: React.FunctionComponent<ICoachmarkCommandBarButtonProps> = (props) => {
  const targetButton = useRef<HTMLDivElement | null>(null);
  const { defaultRender, isCoachmarkVisible, onDismiss, ...buttonProps } = props;
  const ButtonComponent = defaultRender || CommandBarButton;

  return (
    <>
      <div ref={targetButton}>
        <ButtonComponent {...(buttonProps as any)} />
      </div>
      {isCoachmarkVisible && (
        <Coachmark
          target={targetButton.current}
          positioningContainerProps={{
            directionalHint: DirectionalHint.bottomCenter,
          }}
          ariaAlertText="A Coachmark has appeared"
          ariaDescribedBy="coachmark-desc1"
          ariaLabelledBy="coachmark-label1"
          ariaLabelledByText="Coachmark notification"
        >
          <TeachingBubbleContent
            headline="Example Title"
            hasCloseButton={true}
            closeButtonAriaLabel="Close"
            onDismiss={onDismiss}
            ariaDescribedBy="example-description1"
            ariaLabelledBy="example-label1"
          >
            Welcome to the land of Coachmarks!
          </TeachingBubbleContent>
        </Coachmark>
      )}
    </>
  );
};

const overflowButtonProps: IButtonProps = {
  ariaLabel: 'More commands',
};

/** Command bar which renders the Share button with a coachmark */
const IndividualCommandBarButtonAsExample: FunctionComponent<IIndividualCommandBarButtonAsExampleProps> = (props) => {
  const { onDismissCoachmark, isCoachmarkVisible } = props;
  const items: ICommandBarItemProps[] = useMemo(() => {
    return [
      { key: 'save', text: 'Save', iconProps: { iconName: 'Save' }, onClick: () => console.log('Save button clicked') },
      {
        key: 'undo',
        text: 'Undo',
        iconProps: { iconName: 'Undo' },
        split: false,
        subMenuProps: {
          items: [
            { key: 'undo', text: 'Undo', iconProps: { iconName: 'Undo' }, secondaryText: 'Ctrl + Z' },
            { key: 'redo', text: 'Redo', iconProps: { iconName: 'Redo' }, secondaryText: 'Ctrl + Y' },
          ],
        },
        onClick: () => console.log('Undo button clicked'),
      },
      { key: 'discard', text: 'Discard', iconProps: { iconName: 'Cancel' }, onClick: () => console.log('Discard button clicked') },
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
      { key: 'test', text: 'Test', split: true, iconProps: { iconName: 'Play' }, onClick: () => console.log('Test button clicked') },
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
        key: 'configuration',
        text: 'Configuration',
        iconProps: { iconName: 'Settings' },
        onClick: () => console.log('configuration button clicked'),
      },
      {
        key: 'tour_tutorial',
        text: 'Tour / Tutorial',
        iconProps: { iconName: 'Help' },
        onClick: () => console.log('Tour / Tutorial button clicked'),
      },
      {
        key: 'feedback',
        text: 'Give feedback',
        iconProps: { iconName: 'Feedback' },
        onClick: () => console.log('Feedback button clicked'),
      },
    ];
  }, [onDismissCoachmark, isCoachmarkVisible]);

  const _farItems: ICommandBarItemProps[] = [
    {
      key: 'tile',
      text: 'Grid view',
      ariaLabel: 'Grid view',
      iconOnly: true,
      iconProps: { iconName: 'Search' },
      onClick: () => console.log('Search button clicked'),
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
      text: 'Current (Last save: 15 mins ago)',
      split: false,
      subMenuProps: {
        items: [
          { key: 'current', text: 'Current', disabled: true },
          { key: '5-31-2022-314', text: '5/31/2022 3:14 PM' },
          { key: '5-31-2022-214', text: '5/31/2022 2:14 PM' },
          { key: '5-31-2022-114', text: '5/31/2022 1:14 PM' },
          { key: '5-31-2022-1214', text: '5/31/2022 12:14 PM' },
        ],
      },
      onClick: () => console.log('Info'),
    },

    {
      key: 'publish',
      onRenderIcon: () => {
        return <PrimaryButton text="Publish" onClick={() => console.log('Publish button clicked')} />;
      },
    },
  ];

  return (
    <CommandBar
      overflowButtonProps={overflowButtonProps}
      items={items}
      farItems={_farItems}
      ariaLabel="Use left and right arrow keys to navigate between commands"
    />
  );
};

const IndividualCommandBarButtonAsExampleWrapper: FunctionComponent = () => {
  const [isCoachmarkVisible, setIsCoachmarkVisible] = useState(true);

  const onDismissCoachmark = useCallback(() => setIsCoachmarkVisible(false), []);

  return <IndividualCommandBarButtonAsExample onDismissCoachmark={onDismissCoachmark} isCoachmarkVisible={isCoachmarkVisible} />;
};
