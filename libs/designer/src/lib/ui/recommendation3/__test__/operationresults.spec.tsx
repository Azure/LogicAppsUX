import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

import { OperationResults, OperationResultsProps } from '../operationresults';
import { ShowMode } from '../models';

describe('ui/recommendation3/_operationresults', () => {
  const classNames = {
    operationsList: 'msla-operations-list',
  };

  let minimal: OperationResultsProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      canShowMoreOperations: false,
      extraOperations: [],
      filterText: 'My search',
      isLoading: false,
      items: [
        {
          id: 'id',
          brandColor: '',
          description: '',
          icon: '',
          title: '',
          subtitle: '',
          disabled: false,
        },
      ],
      operationKinds: [
        { itemKey: 'TRIGGERS', linkText: 'Triggers' },
        { itemKey: 'ACTIONS', linkText: 'Actions' },
      ],
      selectedKind: 'ACTIONS',
      showMode: ShowMode.Both,
      visible: true,
      onRenderOperation: jest.fn(),
      onSeeMoreOperationsClick: jest.fn(),
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<OperationResults {...minimal} />);

    const results = renderer.getRenderOutput();

    const [message, button, list]: any[] = React.Children.toArray(results.props.children); // tslint:disable-line: no-any

    expect(message.props.filterText).toEqual(minimal.filterText);
    expect(message.props.selectedKind).toEqual(minimal.selectedKind);
    expect(message.props.visible).toBeTruthy();

    expect(button.props.canShowMoreOperations).toBeFalsy();
    expect(button.props.onSeeMoreOperationsClick).toEqual(minimal.onSeeMoreOperationsClick);

    expect(list.props.className).toBe(classNames.operationsList);
    expect(list.props.getItemCountForPage()).toBe(6);
    expect(list.props.items.length).toBe(1);
    expect(list.props.items[0]).toEqual(minimal.items[0]);
    expect(list.props.onRenderCell).toEqual(minimal.onRenderOperation);
  });

  it('should render the "See more" button when there are more operations to load', () => {
    const props = { ...minimal, canShowMoreOperations: true };
    renderer.render(<OperationResults {...props} />);

    const results = renderer.getRenderOutput();

    const [, button]: any[] = React.Children.toArray(results.props.children); // tslint:disable-line: no-any
    expect(button.props.visible).toBeTruthy();
    expect(button.props.onSeeMoreOperationsClick).toEqual(props.onSeeMoreOperationsClick);
  });

  it('should render custom component if provided', () => {
    const resultsRenderer: React.ComponentType = () => <div>dummy component</div>;

    const props = { ...minimal, resultsRenderer };

    renderer.render(<OperationResults {...props} />);

    const results = renderer.getRenderOutput();
    expect(results.type).toEqual(resultsRenderer);
  });
});
