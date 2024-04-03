import { ValueSegmentType } from '../../../editor';
import { CustomTokenField } from '../customTokenField';
import type { SettingTokenFieldProps } from '../settingTokenField';
import { SettingTokenField, TokenField } from '../settingTokenField';
import * as React from 'react';
import * as ReactShallowRenderer from 'react-test-renderer/shallow';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';
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
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
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
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
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
    expect(tokenField[0].props).toEqual({ ...props, labelId: expect.stringContaining('msla-editor-label') });
  });
});
