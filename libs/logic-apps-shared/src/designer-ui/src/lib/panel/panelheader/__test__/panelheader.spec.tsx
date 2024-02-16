import { PanelLocation, PanelScope } from '../../panelUtil';
import type { PanelHeaderProps } from '../panelheader';
import { PanelHeader } from '../panelheader';
import { initializeIcons } from '@fluentui/react';
import { MenuItem } from '@fluentui/react-components';
import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('lib/panel/panelHeader/main', () => {
  let minimal: PanelHeaderProps;
  let minimalWithHeader: PanelHeaderProps;
  let shallow: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      nodeId: '',
      horizontalPadding: '',
      isCollapsed: false,
      headerMenuItems: [],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      toggleCollapse: jest.fn(),
      onTitleChange: jest.fn(),
      commentChange: jest.fn(),
    };
    minimalWithHeader = {
      nodeId: '',
      horizontalPadding: '',
      isCollapsed: false,
      onTitleChange: jest.fn(),
      commentChange: jest.fn(),
      headerMenuItems: [
        <MenuItem key={'Comment'} disabled={false} icon={'Comment'} onClick={jest.fn()}>
          Add a comment
        </MenuItem>,
        <MenuItem key={'Delete'} disabled={false} icon={'Delete'} onClick={jest.fn()}>
          Delete
        </MenuItem>,
      ],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
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
      noNodeSelected: false,
      readOnlyMode: false,
      renameTitleDisabled: false,
      showCommentBox: true,
      title: 'sample title',
      isLoading: false,
      cardIcon: 'sample icon url',
    };
    shallow.render(<PanelHeader {...props} />);
    const panelHeader = shallow.getRenderOutput();
    expect(panelHeader.props.className).toBe('msla-panel-header');

    const [, fragment]: any[] = React.Children.toArray(panelHeader.props.children);

    const [cardHeader, comment]: any[] = React.Children.toArray(fragment.props.children);

    expect(cardHeader.props.className).toBe('msla-panel-card-header');
    const [, titleContainer]: any[] = React.Children.toArray(cardHeader.props.children);

    expect(titleContainer.props.className).toBe('msla-panel-card-title-container');

    const title = titleContainer.props.children;
    expect(title.props.titleId).toBe(props.titleId);
    expect(title.props.readOnlyMode).toBe(props.readOnlyMode);
    expect(title.props.renameTitleDisabled).toBe(props.renameTitleDisabled);
    expect(title.props.titleValue).toBe(props.title);

    expect(comment.props.comment).toBe(props.comment);
    expect(comment.props.isCollapsed).toBe(props.isCollapsed);
    expect(comment.props.noNodeSelected).toBe(props.noNodeSelected);
    expect(comment.props.readOnlyMode).toBe(props.readOnlyMode);
  });
});
