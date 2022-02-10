import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { ValuesPanel, ValuesPanelProps } from '../index';

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

    const [headerContainer, valueList]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(valueList.props).toEqual(
      expect.objectContaining({
        labelledBy: minimal.labelledBy,
        noValuesText: minimal.noValuesText,
        showMore: minimal.showMore,
        values: minimal.values,
      })
    );

    const [header]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(header.props.children).toBe(minimal.headerText);
    expect(header.props.id).toBe(minimal.labelledBy);
    expect(header.props.style).toEqual({
      borderColor: 'rgba(71,71,71, 0.7)',
    });
  });

  it('should render with a brand color when specified', () => {
    renderer.render(<ValuesPanel {...minimal} brandColor="#1f6e43" />);

    const section = renderer.getRenderOutput();
    const [headerContainer]: any[] = React.Children.toArray(section.props.children);
    const [header]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(header.props.style).toEqual({
      borderColor: 'rgba(31,110,67, 0.7)',
    });
  });

  it('should render a link when available', () => {
    const linkText = 'Show inputs';
    renderer.render(<ValuesPanel {...minimal} linkText={linkText} showLink={true} />);

    const section = renderer.getRenderOutput();
    const [headerContainer]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');

    const [, link]: any[] = React.Children.toArray(headerContainer.props.children);
    expect(link.props).toEqual(
      expect.objectContaining({
        linkText,
        visible: true,
      })
    );
  });

  it('should show more values in the list when specified', () => {
    renderer.render(<ValuesPanel {...minimal} showMore={true} />);

    const section = renderer.getRenderOutput();
    const [, valueList]: any[] = React.Children.toArray(section.props.children);
    expect(valueList.props).toEqual(
      expect.objectContaining({
        showMore: true,
      })
    );
  });
});
