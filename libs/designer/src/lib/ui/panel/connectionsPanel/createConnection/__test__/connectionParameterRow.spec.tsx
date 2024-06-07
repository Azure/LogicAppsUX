import { ConnectionParameterRow, type ConnectionParameterRowProps } from '../connectionParameterRow';
import { TooltipHost } from '@fluentui/react';
import React, { ReactNode, type ReactElement } from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
import { Label } from '@microsoft/designer-ui';

describe('ui/connectionParameterRow', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  const render = (props: ConnectionParameterRowProps) => {
    renderer.render(<ConnectionParameterRow {...props} />);
    const connectionParameterRow = renderer.getRenderOutput() as ReactElement;
    const children = React.Children.toArray(connectionParameterRow.props.children) as ReactElement[];
    expect(children.length).toEqual(2);
    const [label, input] = children;

    return {
      connectionParameterRow,
      label,
      input,
    };
  };

  const getProps = (): ConnectionParameterRowProps => ({
    parameterKey: 'parameterKey',
    displayName: 'Display Name',
    tooltip: 'Tooltip content',
    required: true,
    disabled: false,
    children: <Input />,
  });

  const Input = () => <input />;

  it('should render label and children', () => {
    const props = getProps();

    const { connectionParameterRow, label, input } = render(props);

    expect(connectionParameterRow.type).toEqual('div');
    expect(connectionParameterRow.props.className).toEqual('param-row');
    expect(label.type).toEqual(Label);
    expect(input.type).toEqual(Input);
  });

  describe('label', () => {
    it('should render display name', () => {
      const props = getProps();
      props.displayName = 'Display Name';

      const { label } = render(props);

      expect(label.props.text).toEqual(props.displayName);
    });

    it.each([undefined, true, false])('should support required = %s', (required) => {
      const props = getProps();
      props.required = required;

      const { label } = render(props);

      expect(label.props.isRequiredField).toEqual(props.required);
    });

    it.each([undefined, true, false])('should support disabled = %s', (disabled) => {
      const props = getProps();
      props.disabled = disabled;

      const { label } = render(props);

      expect(label.props.disabled).toEqual(props.disabled);
    });

    it('should not render tooltip when not provided', () => {
      const props = getProps();
      props.tooltip = undefined;

      const { label } = render(props);

      expect(label.props.children).toBeUndefined();
    });

    it('should render tooltip when provided', () => {
      const props = getProps();
      props.tooltip = 'Tooltip content';

      const { label } = render(props);
      expect(label.props.children).toBeDefined();
      const labelTooltip = label.props.children as ReactElement;

      expect(labelTooltip).toBeDefined();
      expect(labelTooltip.type).toEqual(TooltipHost);
      expect(labelTooltip.props.content).toEqual(props.tooltip);
    });
  });
});
