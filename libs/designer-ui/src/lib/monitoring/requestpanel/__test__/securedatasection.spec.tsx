import React from 'react';
import ShallowRenderer from 'react-test-renderer/shallow';
import { SecureDataSection, SecureDataSectionProps } from '../securedatasection';

describe('lib/monitoring/requestpanel/securedatasection', () => {
  let minimal: SecureDataSectionProps, renderer: ShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    minimal = {
      headerText: 'header-text',
    };
    renderer = ShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  it('should render', () => {
    renderer.render(<SecureDataSection {...minimal} />);

    const section = renderer.getRenderOutput();
    expect(section.props.className).toBe('msla-trace-inputs-outputs');

    const [headerContainer, values]: any[] = React.Children.toArray(section.props.children);
    expect(headerContainer.props.className).toBe('msla-trace-inputs-outputs-header');
    expect(values.props.className).toBe('msla-trace-values');

    const header = React.Children.only(headerContainer.props.children);
    expect(header.props.style).toEqual({
      borderColor: 'rgba(71,71,71, 0.7)',
    });
    expect(header.props.children).toBe(minimal.headerText);

    const securedTextContainer = React.Children.only(values.props.children);
    expect(securedTextContainer.props.className).toBe('msla-trace-inputs-outputs-secured');

    const securedText = React.Children.only(securedTextContainer.props.children);
    expect(securedText.props.children).toBe('Content not shown due to security configuration.');
    expect(securedText.props.className).toBe('msla-trace-secured-text');
  });
});
