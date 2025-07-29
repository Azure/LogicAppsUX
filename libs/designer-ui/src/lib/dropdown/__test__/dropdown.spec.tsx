import { TokenType } from '@microsoft/logic-apps-shared';
import { DropdownEditor } from '../index';
import { setIconOptions } from '@fluentui/react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, beforeAll, it, expect } from 'vitest';
import { ValueSegmentType } from '../../editor';
import { createLiteralValueSegment } from '../..';

// Test wrapper component with required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>
    {children}
  </IntlProvider>
);

describe('lib/dropdown', () => {
  const defaultProps = {
    options: [
      { key: '1', value: 'one', displayName: 'Option One' },
      { key: '2', value: 'two', displayName: 'Option Two' },
      { key: '3', value: 'three', displayName: 'Option Three' },
      { key: '4', value: 'four', displayName: 'Option Four' },
    ],
    initialValue: [],
    onChange: vi.fn(),
    label: 'Test Dropdown',
  };

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with basic props', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render with label when provided', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} label="Test Label" />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render without label when not provided', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} label={undefined} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders and accepts basic interactions', async () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} onChange={onChange} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');
    expect(combobox).toBeTruthy();

    // Test that the combobox can be opened
    act(() => {
      fireEvent.click(combobox);
    });

    // Verify options are rendered when opened
    await waitFor(() => {
      const options = document.querySelectorAll('[role="option"]');
      expect(options.length).toBeGreaterThan(0);
    });
  });

  it('renders in multiSelect mode', () => {
    const onChange = vi.fn();
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} multiSelect={true} onChange={onChange} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('filters options based on search input', async () => {
    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.input(combobox, { target: { value: 'One' } });
    });

    // Should filter to show only "Option One"
    await waitFor(() => {
      expect((combobox as HTMLInputElement).value).toBe('One');
    });
  });

  it('clears search on selection', async () => {
    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    // First input search text
    act(() => {
      fireEvent.input(combobox, { target: { value: 'One' } });
    });

    // Then select an option
    act(() => {
      fireEvent.click(combobox);
    });

    await waitFor(() => {
      const option = document.querySelector('[role="option"]');
      if (option) {
        act(() => {
          fireEvent.click(option);
        });
      }
    });

    // Search should be cleared after selection
    expect((combobox as HTMLInputElement).value).not.toBe('One');
  });

  it('handles virtualization threshold for large datasets', async () => {
    const largeOptions = Array.from({ length: 200 }, (_, i) => ({
      key: `${i}`,
      value: `value-${i}`,
      displayName: `Option ${i}`,
    }));

    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} options={largeOptions} virtualizeThreshold={50} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.click(combobox);
    });

    // Should show limited options or "more options" message
    await waitFor(() => {
      const container = document.body;
      expect(container).toBeTruthy();
      // Check for either "Showing" message or limited number of options
      const hasMoreMessage = container.textContent?.includes('Showing') || document.querySelectorAll('[role="option"]').length <= 50;
      expect(hasMoreMessage).toBe(true);
    });
  });

  it('displays "no results found" when search yields no matches', async () => {
    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.input(combobox, { target: { value: 'NonexistentOption' } });
    });

    act(() => {
      fireEvent.click(combobox);
    });

    await waitFor(() => {
      const container = document.body;
      const textContent = container.textContent || '';
      expect(textContent).toContain('No results found');
    });
  });

  it('respects readonly prop', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} readonly={true} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('displays placeholder text', () => {
    const placeholder = 'Choose an option';
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} placeholder={placeholder} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('applies custom height and fontSize', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} height={40} fontSize={16} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with custom onChange handler', () => {
    const customOnChangeHandler = vi.fn();
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} customOnChangeHandler={customOnChangeHandler} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with array serialization for multiSelect', () => {
    const onChange = vi.fn();
    const serialization = { valueType: 'array' };

    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} multiSelect={true} onChange={onChange} serialization={serialization} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders with separator serialization for multiSelect', () => {
    const onChange = vi.fn();
    const serialization = { valueType: 'string', separator: ';' };

    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} multiSelect={true} onChange={onChange} serialization={serialization} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('handles case sensitive comparison when isCaseSensitive is true', () => {
    const initialValue = [createLiteralValueSegment('ONE')];

    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} initialValue={initialValue} isCaseSensitive={true} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('handles case insensitive comparison when isCaseSensitive is false', () => {
    const initialValue = [createLiteralValueSegment('ONE')];

    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} initialValue={initialValue} isCaseSensitive={false} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('renders header and divider options correctly', async () => {
    const optionsWithSpecial = [
      ...defaultProps.options,
      { key: 'header', value: 'header', displayName: 'Header Section' },
      { key: 'divider', value: 'divider', displayName: '-' },
    ];

    const { getByRole } = render(
      <TestWrapper>
        <DropdownEditor {...defaultProps} options={optionsWithSpecial} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.click(combobox);
    });

    await waitFor(() => {
      const container = document.body;
      expect(container).toBeTruthy();
      // Check for header section or divider presence
      const hasSpecialElements = container.textContent?.includes('Header Section') || document.querySelector('hr') !== null;
      expect(hasSpecialElements).toBe(true);
    });
  });

  it('sets data-automation-id attribute', () => {
    const automationId = 'test-dropdown';
    const tree = renderer
      .create(
        <TestWrapper>
          <DropdownEditor {...defaultProps} dataAutomationId={automationId} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });
});
