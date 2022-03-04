import type { PagerProps } from '../index';
import { Pager } from '../index';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';

describe('lib/pager', () => {
  const classNames = {
    Pager: 'msla-pager-v2',
    PagerInner: 'msla-pager-v2--inner',
  };

  let minimal: PagerProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      current: 1,
      max: 1,
      min: 1,
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<Pager {...minimal} />);

    const pager = renderer.getRenderOutput();
    expect(pager.props.className).toBe(classNames.Pager);

    const [previous, inner, next] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    expect(previous.props.disabled).toBeTruthy();
    expect(previous.props.iconProps.iconName).toBe('ChevronLeft');
    expect(previous.props.text).toBe('Previous');
    expect(inner.props.className).toBe(classNames.PagerInner);
    expect(next.props.disabled).toBeTruthy();
    expect(next.props.iconProps.iconName).toBe('ChevronRight');
    expect(next.props.text).toBe('Next');

    const [textField, text] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    expect(textField.props.ariaLabel).toBe('1 of 1');
    expect(textField.props.borderless).toBeFalsy();
    expect(textField.props.max).toBe(minimal.max);
    expect(textField.props.min).toBe(minimal.min);
    expect(textField.props.readOnly).toBeFalsy();
    expect(textField.props.value).toBe('1');
    expect(text.props.children).toEqual(['\u00a0', 'of 1']);
  });

  it('should render with read-only pager input', () => {
    renderer.render(<Pager {...minimal} readonlyPagerInput={true} />);

    const pager = renderer.getRenderOutput();
    const [, inner] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    const [textField] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    const [str] = React.Children.toArray(textField.props.children) as React.ReactElement[];
    expect(str).toEqual('1 of 1');
  });

  it('should render with failed iteration buttons', () => {
    const onClickNext = jest.fn();
    const onClickPrevious = jest.fn();
    const failedIterationProps = {
      max: 0,
      min: 0,
      onClickNext,
      onClickPrevious,
    };

    renderer.render(<Pager {...minimal} failedIterationProps={failedIterationProps} />);

    const pager = renderer.getRenderOutput();
    const [, previous, inner, next] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    expect(previous.props.disabled).toBeTruthy();
    expect(previous.props.failed).toBeTruthy();
    expect(previous.props.iconProps.iconName).toBe('ChevronLeft');
    expect(previous.props.text).toBe('Previous failed');
    expect(inner.props.className).toBe(classNames.PagerInner);
    expect(next.props.disabled).toBeTruthy();
    expect(next.props.failed).toBeTruthy();
    expect(next.props.iconProps.iconName).toBe('ChevronRight');
    expect(next.props.text).toBe('Next failed');
  });
});
