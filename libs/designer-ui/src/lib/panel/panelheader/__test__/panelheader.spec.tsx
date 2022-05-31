import { MenuItemType } from '../../../card/types';
import { PanelLocation, PanelScope } from '../../panelUtil';
import type { PanelHeaderProps } from '../panelheader';
import { PanelHeader, PanelHeaderControlType } from '../panelheader';
import { initializeIcons } from '@fluentui/react';
import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('lib/panel/panelHeader/main', () => {
  let minimal: PanelHeaderProps;
  let minimalWithHeader: PanelHeaderProps;
  let shallow: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      isCollapsed: false,
      panelHeaderMenu: [],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      includeTitle: true,
      toggleCollapse: jest.fn(),
    };
    minimalWithHeader = {
      isCollapsed: false,
      panelHeaderMenu: [
        {
          disabled: false,
          type: MenuItemType.Advanced,
          disabledReason: 'Comments can only be added while editing the inputs of a step.',
          iconName: 'Comment',
          key: 'Comment',
          title: 'Add a comment',
          onClick: jest.fn(),
        },
        {
          disabled: false,
          type: MenuItemType.Advanced,
          disabledReason: 'This operation has already been deleted.',
          iconName: 'Delete',
          key: 'Delete',
          title: 'Delete',
          onClick: jest.fn(),
        },
      ],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      includeTitle: true,
      toggleCollapse: jest.fn(),
    };
    shallow = ReactShallowRenderer.createRenderer();
    initializeIcons();
  });

  afterEach(() => {
    shallow.unmount();
  });

  it('should render', () => {
    const panelHeader = renderer.create(<PanelHeader {...minimal} />).toJSON();
    expect(panelHeader).toMatchSnapshot();
  });

  it('should render with panel header menu', () => {
    const props = {
      ...minimalWithHeader,
    };

    const panelHeader = renderer.create(<PanelHeader {...props} />).toJSON();
    expect(panelHeader).toMatchSnapshot();
  });

  it('should have display header content with Menu', () => {
    const props = {
      ...minimalWithHeader,
      isRight: false,
      comment: 'sample comment',
      titleId: 'title id',
      panelHeaderControlType: PanelHeaderControlType.MENU,
      noNodeSelected: false,
      readOnlyMode: false,
      renameTitleDisabled: false,
      showCommentBox: true,
      title: 'sample title',
    };
    shallow.render(<PanelHeader {...props} />);
    const panelHeader = shallow.getRenderOutput();
    expect(panelHeader.props.className).toBe('msla-panel-header');

    const [collapseExpandWrapper, content]: any[] = React.Children.toArray(panelHeader.props.children);
    const [cardHeader, comment]: any[] = React.Children.toArray(content.props.children);
    expect(collapseExpandWrapper.props.className).toBe('collapse-toggle-right');

    const collapseExpandTooltip = collapseExpandWrapper.props.children;
    expect(collapseExpandTooltip.props.content).toBe('Collapse/Expand');

    const collapseExpandButton = collapseExpandTooltip.props.children;
    expect(collapseExpandButton.props.ariaLabel).toBe('Collapse/Expand');
    expect(collapseExpandButton.props.disabled).toBeFalsy();
    expect(collapseExpandButton.props.iconProps).toEqual({ iconName: 'DoubleChevronRight8' });

    expect(cardHeader.props.className).toBe('msla-panel-card-header');
    const [titleContainer, panelControls]: any[] = React.Children.toArray(cardHeader.props.children);

    expect(titleContainer.props.className).toBe('msla-panel-card-title-container');

    const title = titleContainer.props.children;
    expect(title.props.titleId).toBe(props.titleId);
    expect(title.props.readOnlyMode).toBe(props.readOnlyMode);
    expect(title.props.renameTitleDisabled).toBe(props.renameTitleDisabled);
    expect(title.props.savedTitle).toBe(props.title);

    expect(panelControls.props.className).toBe('msla-panel-header-controls');

    const menu = panelControls.props.children[0];
    // Using an empty overflow set to render menu items
    expect(menu.props.items).toHaveLength(0);
    expect(menu.props.overflowItems).toHaveLength(minimalWithHeader.panelHeaderMenu.length);
    expect(comment.props.comment).toBe(props.comment);
    expect(comment.props.isCollapsed).toBe(props.isCollapsed);
    expect(comment.props.noNodeSelected).toBe(props.noNodeSelected);
    expect(comment.props.readOnlyMode).toBe(props.readOnlyMode);
  });

  it('should have display header content with Dismiss', () => {
    const props = {
      ...minimalWithHeader,
      isRight: false,
      comment: 'sample comment',
      titleId: 'title id',
      panelHeaderControlType: PanelHeaderControlType.DISMISS_BUTTON,
      noNodeSelected: false,
      readOnlyMode: false,
      renameTitleDisabled: false,
      showCommentBox: true,
      title: 'sample title',
    };
    shallow.render(<PanelHeader {...props} />);
    const panelHeader = shallow.getRenderOutput();
    const [, content]: any[] = React.Children.toArray(panelHeader.props.children);
    const [cardHeader]: any[] = React.Children.toArray(content.props.children);
    const [, panelControls]: any[] = React.Children.toArray(cardHeader.props.children);
    expect(panelControls.props.className).toBe('msla-panel-header-controls');

    const dismiss = panelControls.props.children[1];
    expect(dismiss.props.content).toBe('Dismiss');

    const button = dismiss.props.children;
    expect(button.props).toHaveProperty('iconProps');
    expect(button.props.iconProps).toEqual({ iconName: 'Clear' });
  });
});
