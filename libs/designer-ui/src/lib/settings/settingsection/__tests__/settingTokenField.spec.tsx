import { ValueSegmentType } from '../../../editor';
import { CustomTokenField } from '../customTokenField';
import type { SettingTokenFieldProps, TokenFieldProps } from '../settingTokenField';
import { SettingTokenField, TokenField } from '../settingTokenField';
import { CopyInputControlWithAgent } from '../../../copyinputcontrol/CopyInputControlWithAgent';
import constants from '../../../constants';
import { InfoDot } from '../../../infoDot';
import { Label } from '../../../label';
import { render as renderDom, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FluentProvider, webDarkTheme } from '@fluentui/react-components';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
describe('ui/settings/settingTokenField', () => {
  let renderer: ReactShallowRenderer.ShallowRenderer;

  beforeEach(() => {
    renderer = ReactShallowRenderer.createRenderer();
  });

  afterEach(() => {
    renderer.unmount();
  });

  function render<P>(Component: React.FunctionComponent<P>, props: P & JSX.IntrinsicAttributes) {
    renderer.render(<Component {...props} />);
    const output = renderer.getRenderOutput();

    return {
      ...output,
      children: React.Children.toArray(output.props.children),
    };
  }

  it.each([undefined, ''])('should render label and token field without empty help (%s)', (helpText) => {
    const props: SettingTokenFieldProps = {
      label: 'name',
      helpText,
      value: [
        {
          value: 'test',
          type: ValueSegmentType.LITERAL,
          id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
        },
      ],
      tokenEditor: true,
      tokenMapping: {},
      onCastParameter: vi.fn(),
      getTokenPicker: vi.fn(),
    };

    const { children } = render(SettingTokenField, props);

    expect(children).toHaveLength(2);
    const [label, tokenFieldContainer] = children as [any, any];

    expect(label.type).toBe('div');
    expect(label.props.className).toBe('msla-input-parameter-label');

    expect(tokenFieldContainer.type).toBe('div');

    const tokenField: any[] = React.Children.toArray(tokenFieldContainer.props.children);
    expect(tokenField[0].type).toBe(TokenField);
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining(props.label) });
    const labelGroup = React.Children.toArray(label.props.children)[0] as React.ReactElement;
    expect(React.Children.toArray(labelGroup.props.children)).toHaveLength(1);
  });

  it('shows help on keyboard focus without changing the label or filled editor', async () => {
    const user = userEvent.setup();
    const props: SettingTokenFieldProps = {
      label: 'Base time',
      helpText: 'Normalize the timestamp to UTC and select UTC as the source time zone.',
      required: true,
      value: [{ id: 'value', type: ValueSegmentType.LITERAL, value: '2026-11-01T06:30:00Z' }],
      tokenEditor: true,
      tokenMapping: {},
      onCastParameter: vi.fn(),
      getTokenPicker: vi.fn(),
      editor: 'internal-custom-editor',
      editorOptions: { EditorComponent: () => <input aria-label="Timestamp" defaultValue="2026-11-01T06:30:00Z" /> },
    };
    const { children } = render(SettingTokenField, props);
    const labelContainer = children[0] as React.ReactElement;
    const labelGroup = React.Children.toArray(labelContainer.props.children)[0] as React.ReactElement;
    const [label, info] = React.Children.toArray(labelGroup.props.children) as React.ReactElement[];
    expect(label.type).toBe(Label);
    expect(label.props).toMatchObject({ text: props.label, isRequiredField: true });
    expect(info.type).toBe(InfoDot);
    expect(info.props).toMatchObject({ title: props.label, description: props.helpText });

    renderDom(
      <FluentProvider theme={webDarkTheme}>
        <SettingTokenField {...props} />
      </FluentProvider>
    );
    const helpIcon = screen.getByLabelText(`${props.label} ${props.helpText}`);
    await user.tab();
    expect(helpIcon).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent(props.helpText ?? '');
    expect(screen.getByRole('textbox', { name: 'Timestamp' })).toHaveValue('2026-11-01T06:30:00Z');
  });

  it('custom editor: should render label and custom token field', () => {
    const MyCustomEditor = () => <div>My Custom Editor</div>;
    const props: SettingTokenFieldProps = {
      label: 'name',
      value: [
        {
          value: 'test',
          type: ValueSegmentType.LITERAL,
          id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
        },
      ],
      tokenEditor: true,
      tokenMapping: {},
      onCastParameter: vi.fn(),
      getTokenPicker: vi.fn(),
      editor: 'internal-custom-editor',
      editorOptions: {
        EditorComponent: MyCustomEditor,
        editor: 'dropdown',
        editorOptions: { options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }] },
      },
    };

    const { children } = render(SettingTokenField, props);

    expect(children).toHaveLength(2);
    const [label, tokenFieldContainer] = children as [any, any];

    expect(label.type).toBe('div');
    expect(label.props.className).toBe('msla-input-parameter-label');

    const tokenField: any[] = React.Children.toArray(tokenFieldContainer.props.children);
    expect(tokenField[0].type).toBe(CustomTokenField);
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining(props.label) });
  });

  it('custom editor: should support hiding label label', () => {
    const MyCustomEditor = () => <div>My Custom Editor</div>;
    const props: SettingTokenFieldProps = {
      label: 'name',
      value: [
        {
          value: 'test',
          type: ValueSegmentType.LITERAL,
          id: '8713da12-1afb-48ce-8fec-429bdb8599b8',
        },
      ],
      tokenEditor: true,
      tokenMapping: {},
      onCastParameter: vi.fn(),
      getTokenPicker: vi.fn(),
      editor: 'internal-custom-editor',
      editorOptions: {
        EditorComponent: MyCustomEditor,
        editor: 'dropdown',
        editorOptions: { options: [{ key: '1', value: 'option 1', displayName: 'Option 1' }] },
        hideLabel: true,
      },
      helpText: 'This help must be hidden with its label.',
    };

    const { children } = render(SettingTokenField, props);

    expect(children).toHaveLength(1);
    const [tokenFieldContainer] = children as [any];

    const tokenField: any[] = React.Children.toArray(tokenFieldContainer.props.children);
    expect(tokenField[0].type).toBe(CustomTokenField);
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining(props.label) });
  });

  describe('COPYABLE editor (Agent-preview navigation sink)', () => {
    const baseProps = (overrides: Partial<TokenFieldProps> = {}): TokenFieldProps => ({
      label: 'agentUrl',
      labelId: 'agentUrl-label',
      value: [
        {
          value: 'https://example.invalid/agent',
          type: ValueSegmentType.LITERAL,
          id: '8713da12-1afb-48ce-8fec-429bdb8599b9',
        },
      ],
      tokenEditor: true,
      tokenMapping: {},
      onCastParameter: vi.fn(),
      getTokenPicker: vi.fn(),
      editor: constants.PARAMETER.EDITOR.COPYABLE,
      ...overrides,
    });

    it('must never source chatUrl/queryParams from schema-declared editorOptions, even when forged values are present', () => {
      const props = baseProps({
        editorOptions: {
          showAgentViewer: true,
          chatUrl: 'https://attacker.example.invalid/chat',
          queryParams: { apiKey: 'forged-key' },
        },
        agentUrlMetadata: undefined,
      });

      const output = render(TokenField, props);

      expect(output.type).toBe(CopyInputControlWithAgent);
      expect(output.props.chatUrl).toBeUndefined();
      expect(output.props.queryParams).toBeUndefined();
      // showAgentViewer is a static, non-navigating visibility flag and remains schema-sourced.
      expect(output.props.showAgentViewer).toBe(true);
    });

    it('sources chatUrl/queryParams only from the trusted runtime agentUrlMetadata field', () => {
      const props = baseProps({
        editorOptions: { showAgentViewer: true },
        agentUrlMetadata: {
          chatUrl: 'https://trusted.example.invalid/chat',
          queryParams: { apiKey: 'trusted-key' },
        },
      });

      const output = render(TokenField, props);

      expect(output.type).toBe(CopyInputControlWithAgent);
      expect(output.props.chatUrl).toBe('https://trusted.example.invalid/chat');
      expect(output.props.queryParams).toEqual({ apiKey: 'trusted-key' });
      expect(output.props.showAgentViewer).toBe(true);
    });

    it('renders ordinary copyable fields with no agent data unaffected', () => {
      const props = baseProps();

      const output = render(TokenField, props);

      expect(output.type).toBe(CopyInputControlWithAgent);
      expect(output.props.text).toBe('https://example.invalid/agent');
      expect(output.props.chatUrl).toBeUndefined();
      expect(output.props.queryParams).toBeUndefined();
      expect(output.props.showAgentViewer).toBeUndefined();
    });
  });
});
