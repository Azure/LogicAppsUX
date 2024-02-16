import type { ValueListProps } from '../valuelist';
import { ValueList } from '../valuelist';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('lib/monitoring/valuespanel/valuelist', () => {
  let minimal: ValueListProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      labelledBy: 'labelled-by',
      noValuesText: 'no-values-text',
      showMore: false,
      values: {},
      onMoreClick: jest.fn(),
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<ValueList {...minimal} />);

    const list = renderer.getRenderOutput();
    expect(list.props).toEqual(
      expect.objectContaining({
        'aria-labelledby': minimal.labelledBy,
        className: 'msla-trace-values',
      })
    );

    const [empty]: any[] = React.Children.toArray(list.props.children);
    expect(empty.props.children).toBe(minimal.noValuesText);
    expect(empty.props.className).toBe('msla-monitoring-parameters-empty');
  });

  it('should render values', () => {
    const values = {
      method: {
        displayName: 'Method',
        value: 'GET',
      },
    };
    renderer.render(<ValueList {...minimal} values={values} />);

    const list = renderer.getRenderOutput();
    const [method]: any[] = React.Children.toArray(list.props.children);
    expect(method.props).toEqual(values['method']);
  });

  it('should render a toggle when there are advanced values', () => {
    const values = {
      method: {
        displayName: 'Method',
        value: 'GET',
      },
      authentication: {
        displayName: 'Authentication',
        value: {
          type: 'None',
        },
        visibility: 'advanced',
      },
    };
    renderer.render(<ValueList {...minimal} values={values} />);

    const list = renderer.getRenderOutput();
    const [, advanced]: any[] = React.Children.toArray(list.props.children);
    const [button]: any[] = React.Children.toArray(advanced.props.children);
    expect(button.props).toEqual(
      expect.objectContaining({
        className: 'msla-button msla-input-parameters-show-more',
        checked: false,
        toggle: true,
        text: 'Show more',
      })
    );
  });

  it('should render more values when specified', () => {
    const values = {
      method: {
        displayName: 'Method',
        value: 'GET',
      },
      authentication: {
        displayName: 'Authentication',
        value: {
          type: 'None',
        },
        visibility: 'advanced',
      },
    };
    renderer.render(<ValueList {...minimal} showMore={true} values={values} />);

    const list = renderer.getRenderOutput();
    const [, advanced]: any[] = React.Children.toArray(list.props.children);
    const [authentication, button]: any[] = React.Children.toArray(advanced.props.children);
    expect(authentication.props).toEqual(values['authentication']);
    expect(button.props).toEqual(
      expect.objectContaining({
        checked: true,
        text: 'Show less',
      })
    );
  });
});
