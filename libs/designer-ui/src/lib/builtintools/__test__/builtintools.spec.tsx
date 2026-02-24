import { BuiltinToolsEditor } from '../index';
import type { BuiltinToolOption } from '../index';
import { render, fireEvent, act } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, it, expect } from 'vitest';
import { createLiteralValueSegment } from '../../editor/base/utils/helper';

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>
    {children}
  </IntlProvider>
);

describe('lib/builtintools', () => {
  const defaultOptions: BuiltinToolOption[] = [
    {
      value: 'code_interpreter',
      displayName: 'Code Interpreter',
      description: 'Enable the agent to write and execute JavaScript code for calculations, data analysis, and file processing.',
    },
  ];

  const defaultProps = {
    initialValue: [],
    options: defaultOptions,
    onChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with basic props', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <BuiltinToolsEditor {...defaultProps} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render header text', () => {
    const { getByText } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} />
      </TestWrapper>
    );

    expect(getByText('Built-in Tools')).toBeTruthy();
  });

  it('should render tool display name and description', () => {
    const { getByText } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} />
      </TestWrapper>
    );

    expect(getByText('Code Interpreter')).toBeTruthy();
    expect(
      getByText('Enable the agent to write and execute JavaScript code for calculations, data analysis, and file processing.')
    ).toBeTruthy();
  });

  it('should render switch as unchecked when initialValue is empty', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[]} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch') as HTMLInputElement;
    expect(switchEl.checked).toBe(false);
  });

  it('should render switch as unchecked when initialValue is empty array string', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[createLiteralValueSegment('[]')]} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch') as HTMLInputElement;
    expect(switchEl.checked).toBe(false);
  });

  it('should render switch as checked when initialValue contains the tool', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[createLiteralValueSegment('["code_interpreter"]')]} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch') as HTMLInputElement;
    expect(switchEl.checked).toBe(true);
  });

  it('should call onChange with tool added when toggling on', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[]} onChange={onChange} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch');
    act(() => {
      fireEvent.click(switchEl);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.value).toHaveLength(1);
    expect(callArg.value[0].value).toBe('["code_interpreter"]');
  });

  it('should call onChange with tool removed when toggling off', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[createLiteralValueSegment('["code_interpreter"]')]} onChange={onChange} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch');
    act(() => {
      fireEvent.click(switchEl);
    });

    expect(onChange).toHaveBeenCalledTimes(1);
    const callArg = onChange.mock.calls[0][0];
    expect(callArg.value).toHaveLength(1);
    expect(callArg.value[0].value).toBe('[]');
  });

  it('should disable switch when readonly is true', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} readonly={true} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch');
    expect(switchEl).toBeDisabled();
  });

  it('should not call onChange when readonly and clicked', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} readonly={true} onChange={onChange} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch');
    act(() => {
      fireEvent.click(switchEl);
    });

    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render multiple tool options', () => {
    const multipleOptions: BuiltinToolOption[] = [
      {
        value: 'code_interpreter',
        displayName: 'Code Interpreter',
        description: 'Execute code.',
      },
      {
        value: 'file_search',
        displayName: 'File Search',
        description: 'Search files.',
      },
    ];

    const { getAllByRole, getByText } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} options={multipleOptions} />
      </TestWrapper>
    );

    const switches = getAllByRole('switch');
    expect(switches).toHaveLength(2);
    expect(getByText('Code Interpreter')).toBeTruthy();
    expect(getByText('File Search')).toBeTruthy();
  });

  it('should handle invalid JSON in initialValue gracefully', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[createLiteralValueSegment('not-valid-json')]} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch') as HTMLInputElement;
    expect(switchEl.checked).toBe(false);
  });

  it('should handle non-array JSON in initialValue gracefully', () => {
    const { getByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} initialValue={[createLiteralValueSegment('"string_value"')]} />
      </TestWrapper>
    );

    const switchEl = getByRole('switch') as HTMLInputElement;
    expect(switchEl.checked).toBe(false);
  });

  it('should render with empty options array', () => {
    const { queryByRole } = render(
      <TestWrapper>
        <BuiltinToolsEditor {...defaultProps} options={[]} />
      </TestWrapper>
    );

    expect(queryByRole('switch')).toBeNull();
  });
});
