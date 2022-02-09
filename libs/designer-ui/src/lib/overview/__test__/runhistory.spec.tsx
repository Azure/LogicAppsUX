import { DetailsListLayoutMode, SelectionMode } from '@fluentui/react';
import ReactShallowRenderer from 'react-test-renderer/shallow';
import { RunHistory, RunHistoryProps } from '../runhistory';

describe('lib/overview/runhistory', () => {
  let minimal: RunHistoryProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      items: [],
      loading: false,
      onOpenRun: jest.fn(),
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('renders correctly', () => {
    renderer.render(<RunHistory {...minimal} />);

    const root = renderer.getRenderOutput();
    expect(root.props.columns).toEqual([
      {
        fieldName: 'identifier',
        isResizable: true,
        key: 'identifier',
        minWidth: 0,
        name: 'Identifier',
      },
      {
        fieldName: 'status',
        isResizable: true,
        key: 'status',
        minWidth: 0,
        name: 'Status',
      },
      {
        fieldName: 'startTime',
        isResizable: true,
        key: 'startTime',
        minWidth: 200,
        name: 'Start time',
      },
      {
        fieldName: 'duration',
        isResizable: true,
        key: 'duration',
        minWidth: 0,
        name: 'Duration',
      },
      {
        fieldName: 'contextMenu',
        isResizable: true,
        key: 'contextMenu',
        minWidth: 0,
        name: '',
      },
    ]);
    expect(root.props.compact).toBeTruthy();
    expect(root.props.enableShimmer).toBe(false);
    expect(root.props.items).toEqual(minimal.items);
    expect(root.props.layoutMode).toBe(DetailsListLayoutMode.justified);
    expect(root.props.selectionMode).toBe(SelectionMode.none);
    expect(root.props.shimmerLines).toBe(1);
  });
});
