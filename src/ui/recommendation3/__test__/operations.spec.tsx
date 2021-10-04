import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { Operations, OperationsProps } from '../operations';
import { ShowMode } from '../models';

describe('ui/recommendation3/_operations', () => {
  let minimal: OperationsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      canShowMoreOperations: false,
      extraOperations: [],
      filterText: 'My search',
      isLoading: false,
      operations: [
        {
          id: 'id',
          brandColor: '',
          description: '',
          icon: '',
          title: '',
          subtitle: '',
        },
      ],
      operationKinds: [
        { itemKey: 'TRIGGERS', linkText: 'Resources.RECOMMENDATION_KIND_TRIGGERS' },
        { itemKey: 'ACTIONS', linkText: 'Resources.RECOMMENDATION_KIND_ACTIONS' },
      ],
      selectedKind: 'ACTIONS',
      showMode: ShowMode.Both,
      visible: true,
      onKindClick: jest.fn(),
      onRenderOperation: jest.fn(),
      onSeeMoreOperationsClick: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Operations {...minimal} />);

    const operations = renderer.getRenderOutput();
    expect(operations.props.className).toMatch(/msla-operations/);

    const [pivot, results]: any[] = React.Children.toArray(operations.props.children); // tslint:disable-line: no-any
    expect(pivot.props.headersOnly).toBeTruthy();

    expect(results.type.name).toBe('OperationResults');
  });

  it('should render when showing operations only', () => {
    const props = { ...minimal, showMode: ShowMode.Operations };
    renderer.render(<Operations {...props} />);

    const operations = renderer.getRenderOutput();
    expect(operations.props.className).toMatch(/msla-operations/);
    expect(operations.props.className).toMatch(/msla-operations-only/);
  });

  it('should not render when not visible', () => {
    const props = { ...minimal, visible: false };
    renderer.render(<Operations {...props} />);

    const operations = renderer.getRenderOutput();
    expect(operations).toBeNull();
  });
});
