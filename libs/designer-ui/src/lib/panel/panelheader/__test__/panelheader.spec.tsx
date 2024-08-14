import { PanelLocation, PanelScope } from '../../panelUtil';
import type { PanelHeaderProps } from '../panelheader';
import { PanelHeader } from '../panelheader';
import { initializeIcons } from '@fluentui/react';
import { MenuItem } from '@fluentui/react-components';
import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('lib/panel/panelHeader/main', () => {
  let minimal: PanelHeaderProps;
  let minimalWithHeader: PanelHeaderProps;
  let shallow: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      nodeData: {
        comment: undefined,
        displayName: 'Node Title',
        errorMessage: undefined,
        iconUri: '',
        isError: false,
        isLoading: false,
        nodeId: 'nodeId',
        onSelectTab: vi.fn(),
        runData: undefined,
        selectedTab: undefined,
        subgraphType: undefined,
        tabs: [],
      },
      isCollapsed: false,
      isOutermostPanel: true,
      headerItems: [],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      toggleCollapse: vi.fn(),
      onTitleChange: vi.fn(),
      commentChange: vi.fn(),
    };
    minimalWithHeader = {
      ...minimal,
      headerItems: [
        <MenuItem key={'Comment'} disabled={false} icon={'Comment'} onClick={vi.fn()}>
          Add a comment
        </MenuItem>,
        <MenuItem key={'Delete'} disabled={false} icon={'Delete'} onClick={vi.fn()}>
          Delete
        </MenuItem>,
      ],
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
    const props: PanelHeaderProps = {
      ...minimalWithHeader,
      nodeData: {
        ...minimalWithHeader.nodeData,
        comment: 'sample comment',
        displayName: 'sample title',
        iconUri: 'sample icon url',
      },
      noNodeSelected: false,
      readOnlyMode: false,
      renameTitleDisabled: false,
      isOutermostPanel: true,
    };
    shallow.render(<PanelHeader {...props} />);
    const panelHeader = shallow.getRenderOutput().props.children[0];
    const comment = shallow.getRenderOutput().props.children[1];
    expect(panelHeader.props.className).toBe('msla-panel-header');

    const [, fragment]: any[] = React.Children.toArray(panelHeader.props.children);

    const [cardHeader]: any[] = React.Children.toArray(fragment.props.children);

    expect(cardHeader.props.className).toBe('msla-panel-card-header');
    const [, titleContainer]: any[] = React.Children.toArray(cardHeader.props.children);

    expect(titleContainer.props.className).toBe('msla-panel-card-title-container');

    const title = titleContainer.props.children;
    expect(title.props.titleId).toBe('nodeId-title');
    expect(title.props.readOnlyMode).toBe(props.readOnlyMode);
    expect(title.props.renameTitleDisabled).toBe(props.renameTitleDisabled);
    expect(title.props.titleValue).toBe(props.nodeData.displayName);

    expect(comment.props.comment).toBe(props.nodeData.comment);
    expect(comment.props.isCollapsed).toBe(props.isCollapsed);
    expect(comment.props.noNodeSelected).toBe(props.noNodeSelected);
    expect(comment.props.readOnlyMode).toBe(props.readOnlyMode);
  });
});
