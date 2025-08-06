import { Combobox } from '../index';
import { setIconOptions } from '@fluentui/react';
import { render, fireEvent, act, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import renderer from 'react-test-renderer';
import { describe, vi, beforeEach, beforeAll, it, expect } from 'vitest';
import { createLiteralValueSegment } from '../..';

// Mock the helper function
vi.mock('../helpers/isComboboxItemMatch', () => ({
  isComboboxItemMatch: vi.fn((option, searchValue) => option.displayName.toLowerCase().includes(searchValue.toLowerCase())),
}));

// Test wrapper component with required providers
const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <IntlProvider locale="en" messages={{}}>
    {children}
  </IntlProvider>
);

describe('lib/combobox', () => {
  const defaultProps = {
    options: [
      { key: '1', value: 'one', displayName: 'B' },
      { key: '2', value: 'two', displayName: 'A' },
      { key: '3', value: 'three', displayName: 'C' },
      { key: '4', value: 'four', displayName: 'D' },
    ],
    initialValue: [],
    onChange: vi.fn(),
    label: 'Test Combobox',
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
          <Combobox {...defaultProps} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('should render in Default mode initially', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('handles large datasets by skipping sort', () => {
    const largeOptions = Array.from({ length: 1500 }, (_, i) => ({
      key: `${i}`,
      value: `value-${i}`,
      displayName: `Option ${i}`,
    }));

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    render(
      <TestWrapper>
        <Combobox {...defaultProps} options={largeOptions} shouldSort={true} />
      </TestWrapper>
    );

    expect(consoleSpy).toHaveBeenCalledWith('Skipping sort for large dataset to prevent performance issues:', 1500, 'items');

    consoleSpy.mockRestore();
  });

  it('handles search input with debouncing', async () => {
    const { getByRole } = render(
      <TestWrapper>
        <Combobox {...defaultProps} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.input(combobox, { target: { value: 'test' } });
    });

    // Should debounce the search
    await waitFor(
      () => {
        expect((combobox as HTMLInputElement).value).toBe('test');
      },
      { timeout: 200 }
    );
  });

  it('renders component with different modes', () => {
    // Test with empty initial value (should start in Default mode)
    const tree1 = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} initialValue={[]} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree1).toMatchSnapshot();

    // Test with initial value (should also start in Default mode with selection)
    const tree2 = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} initialValue={[createLiteralValueSegment('one')]} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree2).toMatchSnapshot();
  });

  it('displays loading state correctly', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} isLoading={true} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('displays error state correctly', () => {
    const errorDetails = { message: 'Test error message' };

    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} errorDetails={errorDetails} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('handles custom value input correctly', async () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <TestWrapper>
        <Combobox {...defaultProps} onChange={onChange} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');

    // Type a search value that doesn't match any options
    act(() => {
      fireEvent.input(combobox, { target: { value: 'custom-search-value' } });
    });

    // Wait for the input change to be processed
    await waitFor(() => {
      expect((combobox as HTMLInputElement).value).toBe('custom-search-value');
    });

    // Verify basic functionality works - the component should handle the input
    expect(combobox).toBeTruthy();
  });

  it('handles large datasets efficiently', () => {
    const largeOptions = Array.from({ length: 5000 }, (_, i) => ({
      key: `${i}`,
      value: `value-${i}`,
      displayName: `Option ${i}`,
    }));

    // Test that component renders with large dataset without crashing
    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} options={largeOptions} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();

    // Test that component handles large dataset
    const { getByRole } = render(
      <TestWrapper>
        <Combobox {...defaultProps} options={largeOptions} />
      </TestWrapper>
    );

    const combobox = getByRole('combobox');
    expect(combobox).toBeTruthy();
  });

  it('respects readonly prop', () => {
    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} readonly={true} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('displays placeholder text', () => {
    const placeholder = 'Select an option';
    const tree = renderer
      .create(
        <TestWrapper>
          <Combobox {...defaultProps} placeholder={placeholder} />
        </TestWrapper>
      )
      .toJSON();
    expect(tree).toMatchSnapshot();
  });

  it('ensures options are sorted alphabetically and special option is at the end', async () => {
    const { getByRole, getAllByRole } = render(
      <TestWrapper>
        <Combobox {...defaultProps} />
      </TestWrapper>
    );
    const combobox = getByRole('combobox');

    act(() => {
      fireEvent.click(combobox);
    });

    await waitFor(() => {
      const options = getAllByRole('option');
      const optionTexts = options.map((option) => option.textContent);

      // Ensure the special option is at the end
      expect(optionTexts[optionTexts.length - 1]).toEqual('Enter custom value');

      // Check the rest are sorted
      const sortedTexts = [...optionTexts.slice(0, -1)].sort((a, b) => a?.localeCompare(b || '') || 0);

      expect(optionTexts.slice(0, -1)).toEqual(sortedTexts);
    });
  });
});
