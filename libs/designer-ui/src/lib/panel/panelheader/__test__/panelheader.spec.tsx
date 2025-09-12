import { PanelLocation, PanelScope } from '../../panelUtil';
import type { PanelHeaderProps } from '../panelheader';
import { PanelHeader } from '../panelheader';
import { initializeIcons } from '@fluentui/react';
import { MenuItem } from '@fluentui/react-components';
import React from 'react';
import renderer from 'react-test-renderer';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

// Mock react-intl
vi.mock('react-intl', async () => {
  const actualIntl = await vi.importActual('react-intl');
  return {
    ...actualIntl,
    useIntl: () => ({
      formatMessage: vi.fn(({ defaultMessage }) => defaultMessage),
      formatDate: vi.fn((date) => `Formatted: ${date}`),
    }),
  };
});

describe('lib/panel/panelHeader/main', () => {
  let minimal: PanelHeaderProps;
  let minimalWithHeader: PanelHeaderProps;
  let minimalWithButtons: PanelHeaderProps;
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
      isOutermostPanel: true,
      headerItems: [],
      headerLocation: PanelLocation.Right,
      panelScope: PanelScope.CardLevel,
      onClose: vi.fn(),
      onTitleChange: vi.fn(),
      commentChange: vi.fn(),
      handleTitleUpdate: vi.fn(),
    };
    minimalWithHeader = {
      ...minimal,
      headerItems: [
        <MenuItem key={'Description'} disabled={false} icon={'Description'} onClick={vi.fn()}>
          Add a description
        </MenuItem>,
        <MenuItem key={'Delete'} disabled={false} icon={'Delete'} onClick={vi.fn()}>
          Delete
        </MenuItem>,
      ],
    };
    minimalWithButtons = {
      ...minimal,
      canResubmit: true,
      canShowLogicAppRun: true,
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
        comment: 'sample description',
        displayName: 'sample title',
        iconUri: 'sample icon url',
      },
      readOnlyMode: false,
      renameTitleDisabled: false,
      isOutermostPanel: true,
    };
    shallow.render(<PanelHeader {...props} />);
    const panelHeader = shallow.getRenderOutput().props.children[0];
    const comment = shallow.getRenderOutput().props.children[2];
    expect(panelHeader.props.className).toBe('msla-panel-header');

    const [cardHeader]: any[] = React.Children.toArray(panelHeader.props.children);
    expect(cardHeader.props.className).toBe('msla-panel-card-header');

    const [_, titleContainer]: any[] = React.Children.toArray(cardHeader.props.children);

    expect(titleContainer.props.className).toBe('msla-panel-card-title-container');

    const title = titleContainer.props.children;
    expect(title.props.titleId).toBe('nodeId-title');
    expect(title.props.readOnlyMode).toBe(props.readOnlyMode);
    expect(title.props.renameTitleDisabled).toBe(props.renameTitleDisabled);
    expect(title.props.titleValue).toBe(props.nodeData.displayName);

    expect(comment.props.comment).toBe(props.nodeData.comment);
    expect(comment.props.readOnlyMode).toBe(props.readOnlyMode);
  });

  it('should render with panel header buttons', () => {
    const panelHeader = renderer.create(<PanelHeader {...minimalWithButtons} />).toJSON();
    expect(panelHeader).toMatchSnapshot();
  });

  it('should render with panel header trigger info message', () => {
    const props = {
      ...minimalWithButtons,
      showTriggerInfo: true,
    };
    const panelHeader = renderer.create(<PanelHeader {...props} />).toJSON();
    expect(panelHeader).toMatchSnapshot();
  });
});
