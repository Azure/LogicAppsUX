import type { ErrorSectionProps } from '..';
import { ErrorSection } from '..';
import { MessageBarType } from '@fluentui/react';
import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';

describe('lib/monitoring/requestpanel/errorsection', () => {
  let minimal: ErrorSectionProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      error: {
        code: '504',
        message: 'GatewayTimeout',
      },
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<ErrorSection {...minimal} />);

    const messageBar = renderer.getRenderOutput();
    expect(messageBar.props.messageBarType).toBe(MessageBarType.severeWarning);

    const [code, message]: any[] = React.Children.toArray(messageBar.props.children);
    expect(code.props.children).toBe(minimal?.error?.code);
    expect(message.props.children).toBe(minimal?.error?.message);
  });

  it('should render with a CSS class', () => {
    const className = 'msla-request-history-panel-error';
    renderer.render(<ErrorSection {...minimal} className={className} />);

    const messageBar = renderer.getRenderOutput();
    expect(messageBar.props.className).toBe(className);
  });

  it('should not render when there is no error', () => {
    renderer.render(<ErrorSection />);

    const messageBar = renderer.getRenderOutput();
    expect(messageBar).toBeNull();
  });
});
