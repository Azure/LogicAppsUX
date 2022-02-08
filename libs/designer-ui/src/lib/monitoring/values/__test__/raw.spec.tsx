import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import Constants from '../../../constants';
import { RawValue } from '../raw';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/_raw', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: 'value',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<RawValue {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props.className).toBe(classNames.text);
    expect(text.props.children).toBe(props.value);
    expect(text.props.tabIndex).toBe(0);
  });

  it('should rendered a zero-width space if value is empty', () => {
    props.value = '';
    renderer.render(<RawValue {...props} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    expect(text.props.children).toBe(Constants.ZERO_WIDTH_SPACE);
  });
});
