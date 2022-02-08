import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import Constants from '../../../constants';
import type { ValueProps } from '../types';
import { XmlValue } from '../xml';

describe('ui/monitoring/values/xml', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
    props = {
      displayName: 'XML',
      value: {
        '$content-type': 'application/xml',
        $content: 'PHhtbD48L3htbD4=',
      },
    };
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render XML', () => {
    renderer.render(<XmlValue {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props.className).toBe(classNames.text);
    expect(text.props.children).toBe('<xml></xml>');
  });

  it('should render XML without the UTF-8 byte order mark (BOM)', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content: '77u/PHhtbD48L3htbD4=', // <xml></xml> with a prepended UTF-8 BOM
    };
    renderer.render(<XmlValue {...props} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    expect(text.props.children).toBe('<xml></xml>');
  });

  it('should render a zero-width space if value is empty', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content: '',
    };
    renderer.render(<XmlValue {...props} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    expect(text.props.children).toBe(Constants.ZERO_WIDTH_SPACE);
  });

  it('should render XML with encoded UTF-8 Chinese correctly', () => {
    props.value = {
      '$content-type': 'application/xml',
      $content:
        '77u/PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz48cm9vdD48bmFtZSB1c2VybmFtZT0iSlMx55So5oi35ZCNIj7kvaDlpb0gSm9objwvbmFtZT48bmFtZSB1c2VybmFtZT0iTUkx55So5oi35ZCNIj7kuK3mlofmtYvor5U8L25hbWU+PC9yb290Pg==',
    };
    renderer.render(<XmlValue {...props} />);

    const section = renderer.getRenderOutput();
    const [, text]: any[] = React.Children.toArray(section.props.children);
    expect(text.props.children).toBe(
      '<?xml version="1.0" encoding="utf-8"?><root><name username="JS1用户名">你好 John</name><name username="MI1用户名">中文测试</name></root>'
    );
  });
});
