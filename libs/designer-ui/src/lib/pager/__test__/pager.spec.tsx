import type { PagerProps } from '../index';
import { Pager } from '../index';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
describe('lib/pager', () => {
  const classNames = {
    Pager: 'msla-pager-v2',
    PagerInner: 'msla-pager-v2--inner',
    PageNumber: 'msla-pager-pageNum',
    PageNumberToSelect: 'msla-pager-pageNum toSelect',
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

  it('should render the default pager', () => {
    renderer.render(<Pager {...minimal} />);

    const pagerWrapper = renderer.getRenderOutput();
    const [pager] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
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

  it('should render the default pager with read-only pager input', () => {
    renderer.render(<Pager {...minimal} readonlyPagerInput={true} />);

    const pagerWrapper = renderer.getRenderOutput();
    const [pager] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
    const [, inner] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    const [textField] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    const [str] = React.Children.toArray(textField.props.children) as React.ReactElement[];
    expect(str).toEqual('1 of 1');
  });

  it('should render the default pager with failed iteration buttons', () => {
    const onClickNext = vi.fn();
    const onClickPrevious = vi.fn();
    const failedIterationProps = {
      max: 0,
      min: 0,
      onClickNext,
      onClickPrevious,
    };

    renderer.render(<Pager {...minimal} failedIterationProps={failedIterationProps} />);

    const pagerWrapper = renderer.getRenderOutput();
    const [pager] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
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

  it('should render the pager with clickable page numbers of less than max numbers', () => {
    renderer.render(<Pager {...minimal} max={2} clickablePageNumbers={true} />);

    const pagerWrapper = renderer.getRenderOutput();
    const [pager] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
    const [, inner] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    expect(inner.props.className).toBe(classNames.PagerInner);
    expect(inner.props.children.length).toBe(2);
    const [number1, number2] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    expect(number1.props.className).toBe(classNames.PageNumber);
    expect(number2.props.className).toBe(classNames.PageNumberToSelect);
    const [number1Children] = React.Children.toArray(number1.props.children) as React.ReactElement[];
    expect(number1Children).toEqual(1);
    const [number2Children] = React.Children.toArray(number2.props.children) as React.ReactElement[];
    expect(number2Children).toEqual(2);
  });

  it('should render the pager with clickable page numbers with more than max numbers', () => {
    renderer.render(<Pager {...minimal} max={6} clickablePageNumbers={true} />);

    const pagerWrapper = renderer.getRenderOutput();
    const [pager] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
    const [, inner] = React.Children.toArray(pager.props.children) as React.ReactElement[];
    expect(inner.props.className).toBe(classNames.PagerInner);
    expect(inner.props.children.length).toBe(5);
    const [number1, number2, number3, number4, number5] = React.Children.toArray(inner.props.children) as React.ReactElement[];
    expect(number1.props.className).toBe(classNames.PageNumber);
    expect(number2.props.className).toBe(classNames.PageNumberToSelect);
    expect(number3.props.className).toBe(classNames.PageNumberToSelect);
    expect(number4.props.className).toBe(classNames.PageNumberToSelect);
    expect(number5.props.className).toBe(classNames.PageNumberToSelect);
    const [number1Children] = React.Children.toArray(number1.props.children) as React.ReactElement[];
    expect(number1Children).toEqual(1);
    const [number2Children] = React.Children.toArray(number2.props.children) as React.ReactElement[];
    expect(number2Children).toEqual(2);
    const [number3Children] = React.Children.toArray(number3.props.children) as React.ReactElement[];
    expect(number3Children).toEqual(3);
    const [number4Children] = React.Children.toArray(number4.props.children) as React.ReactElement[];
    expect(number4Children).toEqual(4);
    const [number5Children] = React.Children.toArray(number5.props.children) as React.ReactElement[];
    expect(number5Children).toEqual(5);
  });

  it('should render the pager with count info', () => {
    renderer.render(
      <Pager
        {...minimal}
        countToDisplay={{
          countPerPage: 5,
          totalCount: 10,
        }}
      />
    );

    const pagerWrapper = renderer.getRenderOutput();
    const [countInfo] = React.Children.toArray(pagerWrapper.props.children) as React.ReactElement[];
    expect(countInfo.props.className).toBe(classNames.Pager);
    const [countInfoInner] = React.Children.toArray(countInfo.props.children) as React.ReactElement[];
    expect(countInfoInner.props.className).toBe(classNames.PagerInner);
    const [textField] = React.Children.toArray(countInfoInner.props.children) as React.ReactElement[];
    const [str] = React.Children.toArray(textField.props.children) as React.ReactElement[];
    expect(str).toEqual('Showing 1 - 5 of 10 results.');
  });
});
