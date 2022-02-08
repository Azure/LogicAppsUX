import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { BodyLinkValue } from '../bodylink';
import { RawValue } from '../raw';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/_bodylink', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'displayName',
      value: {
        contentHash: {
          algorithm: 'algorithm',
          value: 'value',
        },
        contentSize: 425,
        contentVersion: 'contentVersion',
        uri: 'uri',
      },
      visible: true,
    };

    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render when it is a content link', () => {
    renderer.render(<BodyLinkValue {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props.className).toBe(classNames.text);

    const link = React.Children.only(text.props.children);
    expect(link.props['aria-labelledby']).toBe(displayName.props.id);
    expect(link.props.children).toBe('Download (Alt/Option + click)');
    expect(link.props.href).toBe(props.value.uri);
    expect(link.props.rel).toBe('noopener');
    expect(link.props.target).toBe('_blank');
  });

  it('should render as raw value when it is not a content link', () => {
    props.value = 'value';
    renderer.render(<BodyLinkValue {...props} />);

    expect(renderer.getRenderOutput()).toEqual(<RawValue {...props} />);
  });

  it('should render nothing if not visible', () => {
    renderer.render(<BodyLinkValue {...props} visible={false} />);

    expect(renderer.getRenderOutput()).toBeNull();
  });
});
