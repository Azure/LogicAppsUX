import { ContextualMenuItemType } from '@fluentui/react/lib/ContextualMenu';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Menu, MenuItemOption, MenuProps, MenuItemType } from '../../menu';

describe('ui/card/menu', () => {
  let minimal: MenuProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      menuItems: [],
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render an empty menu', () => {
    renderer.render(<Menu {...minimal} />);

    const menu = renderer.getRenderOutput();
    expect(menu.props.items).toEqual([]);
    expect(menu.props.shouldFocusOnMount).toBeTruthy();
  });

  describe('Advanced Menu Items', () => {
    it('should render an advanced menu item', () => {
      const menuItems: MenuItemOption[] = [
        {
          key: '1',
          title: 'Title',
          type: MenuItemType.Advanced,
        },
      ];
      renderer.render(<Menu {...minimal} menuItems={menuItems} />);

      const menu = renderer.getRenderOutput();
      const [menuItem] = menuItems;
      expect(menu.props.items).toEqual([
        expect.objectContaining({
          name: menuItem.title,
          key: menuItem.key,
        }),
      ]);
      expect(menu.props.shouldFocusOnMount).toBeTruthy();
    });
  });

  describe('Divider', () => {
    it('should render a divider', () => {
      const menuItems: MenuItemOption[] = [
        {
          key: '1',
          title: 'Title',
          type: MenuItemType.Divider,
        },
      ];
      renderer.render(<Menu {...minimal} menuItems={menuItems} />);

      const menu = renderer.getRenderOutput();
      const [menuItem] = menuItems;
      expect(menu.props.items).toEqual([
        {
          itemType: ContextualMenuItemType.Divider,
          name: menuItem.title,
          key: menuItem.key,
        },
      ]);
      expect(menu.props.shouldFocusOnMount).toBeTruthy();
    });
  });

  describe('Header', () => {
    it('should render a header', () => {
      const menuItems: MenuItemOption[] = [
        {
          key: '1',
          title: 'Title',
          type: MenuItemType.Header,
        },
      ];
      renderer.render(<Menu {...minimal} menuItems={menuItems} />);

      const menu = renderer.getRenderOutput();
      const [menuItem] = menuItems;
      expect(menu.props.items).toEqual([
        expect.objectContaining({
          itemType: ContextualMenuItemType.Header,
          name: menuItem.title,
          key: menuItem.key,
        }),
      ]);
      expect(menu.props.shouldFocusOnMount).toBeTruthy();
    });
  });

  describe('Normal Menu Item', () => {
    it('should render a normal menu item', () => {
      const clickHandler = jest.fn();
      const menuItems: MenuItemOption[] = [
        {
          key: '1',
          title: 'Title',
          type: MenuItemType.Normal,
          clickHandler,
        },
      ];
      renderer.render(<Menu {...minimal} menuItems={menuItems} />);

      const menu = renderer.getRenderOutput();
      const [menuItem] = menuItems;
      expect(menu.props.items).toEqual([
        expect.objectContaining({
          itemType: ContextualMenuItemType.Normal,
          name: menuItem.title,
          key: menuItem.key,
        }),
      ]);
      expect(menu.props.shouldFocusOnMount).toBeTruthy();
    });
  });

  describe('onDismiss', () => {
    it('should fire a dismiss event when dismissed', () => {
      const onDismiss = jest.fn();
      renderer.render(<Menu {...minimal} onDismiss={onDismiss} />);

      const menu = renderer.getRenderOutput();
      menu.props.onDismiss();
      expect(onDismiss).toHaveBeenCalled();
    });
  });
});
