import { useBoolean } from '@fluentui/react-hooks';
import { ComponentMeta, ComponentStory } from '@storybook/react';
import { useRef } from 'react';
import { CardContextMenu, CardContextMenuProps } from './cardcontextmenu';
import { MenuItemType } from './index';

export default {
  component: CardContextMenu,
  title: 'Components/Card/CardContextMenu',
} as ComponentMeta<typeof CardContextMenu>;

const Template: ComponentStory<typeof CardContextMenu> = (args: CardContextMenuProps) => {
  const [showContextMenu, { setFalse, toggle }] = useBoolean(false);
  const ref = useRef<HTMLButtonElement | null>(null);

  return (
    <>
      <button className="msla-button" ref={ref} onClick={toggle}>
        Show menu
      </button>
      <CardContextMenu {...args} contextMenuLocation={ref.current} showContextMenu={showContextMenu} onSetShowContextMenu={setFalse} />
    </>
  );
};

export const Standard = Template.bind({});
Standard.args = {
  contextMenuOptions: [
    {
      disabled: false,
      iconName: 'Delete',
      key: 'Delete',
      title: 'Delete',
      type: MenuItemType.Normal,
      clickHandler() {
        console.log('Delete clicked');
      },
    },
  ],
  title: 'Show menu button',
};
