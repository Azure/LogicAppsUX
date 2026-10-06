import { ValueSegmentType } from '../../../editor';
import { CustomTokenField } from '../customTokenField';
import type { SettingTokenFieldProps, TokenFieldProps } from '../settingTokenField';
import { SettingTokenField, TokenField } from '../settingTokenField';
import { CopyInputControlWithAgent } from '../../../copyinputcontrol/CopyInputControlWithAgent';
import constants from '../../../constants';
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

  it('should render label and token field', () => {
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
