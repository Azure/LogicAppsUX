import { DirectionalHint } from '@fluentui/react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { CardContextMenu, CardContextMenuProps } from '../cardcontextmenu';
import { MenuItemType } from '../cardv2';

describe('lib/card/cardcontextmenu', () => {
  let minimal: CardContextMenuProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      contextMenuLocation: undefined,
      showContextMenu: false,
      title: 'title',
      onSetShowContextMenu: jest.fn(),
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    const props: CardContextMenuProps = {
      ...minimal,
      contextMenuOptions: [
        {
          disabled: false,
          iconName: 'Delete',
          key: 'Delete',
          title: 'Delete',
          type: MenuItemType.Normal,
          clickHandler: jest.fn(),
        },
      ],
      showContextMenu: true,
    };

    renderer.render(<CardContextMenu {...props} />);

    const menu = renderer.getRenderOutput();
    expect(menu.props).toEqual(
      expect.objectContaining({
        ariaLabel: `Context menu for ${minimal.title} card`,
        calloutProps: {
          preventDismissOnLostFocus: false,
          preventDismissOnResize: false,
          preventDismissOnScroll: false,
        },
        directionalHint: DirectionalHint.bottomLeftEdge,
        isBeakVisible: false,
        items: [
          expect.objectContaining({
            key: props.contextMenuOptions?.[0].key,
            disabled: false,
            iconOnly: true,
            iconProps: {
              iconName: props.contextMenuOptions?.[0].iconName,
            },
            name: props.contextMenuOptions?.[0].title,
          }),
        ],
      })
    );
  });

  it('should not render when not visible', () => {
    renderer.render(<CardContextMenu {...minimal} />);

    const menu = renderer.getRenderOutput();
    expect(menu).toBeNull();
  });
});
