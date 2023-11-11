import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { HtmlValue } from '../html';
import type { ValueProps } from '../types';

describe('ui/monitoring/values/_html', () => {
  const classNames = {
    displayName: 'msla-trace-value-display-name',
    htmlTable: 'msla-trace-value-html-table',
    label: 'msla-trace-value-label',
    text: 'msla-trace-value-text',
  };

  let props: ValueProps, renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    props = {
      displayName: 'display-name',
      value: '<table><tbody><tr><td>1</td></tr></tbody></table>',
    };
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<HtmlValue {...props} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe(classNames.label);

    const [displayName, text]: any[] = React.Children.toArray(section.props.children);
    expect(displayName.props.className).toBe(classNames.displayName);
    expect(displayName.props.children).toBe(props.displayName);
    expect(text.props['aria-labelledby']).toBe(displayName.props.id);
    expect(text.props.className.split(' ')).toEqual(expect.arrayContaining([classNames.text, classNames.htmlTable]));

    const table = React.Children.only(text.props.children);
    expect(table.props.dangerouslySetInnerHTML).toEqual(
      expect.objectContaining({
        __html: props.value,
      })
    );
  });

  it('should not render when not visible', () => {
    renderer.render(<HtmlValue {...props} visible={false} />);

    const section = renderer.getRenderOutput();
    expect(section).toBeNull();
  });
});
