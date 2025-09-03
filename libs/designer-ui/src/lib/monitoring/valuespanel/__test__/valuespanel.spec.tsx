import type { ValuesPanelProps } from '../index';
import { ValuesPanel } from '../index';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('lib/monitoring/valuespanel', () => {
  let minimal: ValuesPanelProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      headerText: 'header-text',
      labelledBy: 'labelled-by',
      noValuesText: 'no-values-text',
      showMore: false,
      values: {},
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<ValuesPanel {...minimal} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe('msla-trace-inputs-outputs');
    const [headerContainer, valueListContainer]: any[] = React.Children.toArray(section.props.children);
    const [valueList]: any[] = React.Children.toArray(valueListContainer.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(valueList.props).toEqual(
      expect.objectContaining({
        labelledBy: minimal.labelledBy,
        noValuesText: minimal.noValuesText,
        showMore: minimal.showMore,
        values: minimal.values,
      })
    );

    const [_, header]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(header.props.children).toBe(minimal.headerText);
  });

  it('should render with a brand color when specified', () => {
    renderer.render(<ValuesPanel {...minimal} brandColor="#1f6e43" />);

    const section = renderer.getRenderOutput();
    const [headerContainer]: any[] = React.Children.toArray(section.props.children);
    const [brandIndicator]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(brandIndicator.props.style).toEqual(
      expect.objectContaining({
        background: '#1f6e43',
      })
    );
  });

  it('should render a link when available', () => {
    const linkText = 'Show inputs';
    renderer.render(<ValuesPanel {...minimal} linkText={linkText} showLink={true} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe('msla-trace-inputs-outputs');
    const [headerContainer, valueListContainer]: any[] = React.Children.toArray(section.props.children);
    const [valueList]: any[] = React.Children.toArray(valueListContainer.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    const [_, headerButton, linkButton]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(linkButton.props).toEqual(
      expect.objectContaining({
        linkText,
        visible: true,
      })
    );
  });

  it('should show more values in the list when specified', () => {
    renderer.render(<ValuesPanel {...minimal} showMore={true} />);

    const section = renderer.getRenderOutput();
    const [, valueListContainer]: any[] = React.Children.toArray(section.props.children);
    const [valueList]: any[] = React.Children.toArray(valueListContainer.props.children);
    expect(valueList.props).toEqual(
      expect.objectContaining({
        showMore: true,
      })
    );
  });
});
