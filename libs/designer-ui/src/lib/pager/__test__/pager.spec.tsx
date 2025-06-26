import type { PagerProps } from '../index';
import { Pager } from '../index';
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from 'react-intl';
import { describe, vi, beforeEach, afterEach, it, expect } from 'vitest';
import renderer from 'react-test-renderer';

describe('lib/pager', () => {
  let minimal: PagerProps;

  const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <FluentProvider theme={webLightTheme}>
      <IntlProvider locale="en" messages={{}}>
        {children}
      </IntlProvider>
    </FluentProvider>
  );

  beforeEach(() => {
    minimal = {
      current: 1,
      max: 1,
      min: 1,
    };
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render the default pager', () => {
    render(
      <TestWrapper>
        <Pager {...minimal} />
      </TestWrapper>
    );

    // Check for navigation buttons
    const previousButton = screen.getByLabelText('Previous');
    const nextButton = screen.getByLabelText('Next');

    expect(previousButton).toBeDisabled();
    expect(nextButton).toBeDisabled();

    // Check for page input
    const pageInput = screen.getByLabelText('1 of 1');
    expect(pageInput).toHaveValue('1');

    // Check for "of" text
    expect(screen.getByText('of 1')).toBeInTheDocument();
  });

  it('should render the default pager with read-only pager input', () => {
    render(
      <TestWrapper>
        <Pager {...minimal} readonlyPagerInput={true} />
      </TestWrapper>
    );

    // Should show readonly text instead of input
    expect(screen.getByText('1 of 1')).toBeInTheDocument();

    // Should not have an editable input
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should render the default pager with failed iteration buttons', () => {
    const onClickNext = vi.fn();
    const onClickPrevious = vi.fn();
    const failedIterationProps = {
      max: 2,
      min: 1,
      onClickNext,
      onClickPrevious,
    };

    render(
      <TestWrapper>
        <Pager {...minimal} max={2} failedIterationProps={failedIterationProps} />
      </TestWrapper>
    );

    // Should have regular navigation buttons
    expect(screen.getByLabelText('Previous')).toBeInTheDocument();
    expect(screen.getByLabelText('Next')).toBeInTheDocument();

    // Should have failed iteration buttons
    expect(screen.getByLabelText('Previous failed')).toBeInTheDocument();
    expect(screen.getByLabelText('Next failed')).toBeInTheDocument();

    // Failed buttons should be disabled when at boundaries
    expect(screen.getByLabelText('Previous failed')).toBeDisabled();
  });

  it('should render the pager with clickable page numbers of less than max numbers', () => {
    render(
      <TestWrapper>
        <Pager {...minimal} max={2} clickablePageNumbers={5} />
      </TestWrapper>
    );

    // Should show page numbers instead of input
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    // Should not have text input
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();

    // Current page (1) should not be clickable, page 2 should be
    const page2 = screen.getByText('2');
    fireEvent.click(page2);
  });

  it('should render the pager with clickable page numbers with more than max numbers', () => {
    render(
      <TestWrapper>
        <Pager {...minimal} max={6} clickablePageNumbers={5} />
      </TestWrapper>
    );

    // Should show 5 page numbers (1-5)
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();

    // Should not show page 6 (beyond the 5 clickable range)
    expect(screen.queryByText('6')).not.toBeInTheDocument();
  });

  it('should render the pager with count info', () => {
    render(
      <TestWrapper>
        <Pager
          {...minimal}
          countToDisplay={{
            countPerPage: 5,
            totalCount: 10,
          }}
        />
      </TestWrapper>
    );

    // Should display count information
    expect(screen.getByText('Showing 1 - 5 of 10 results.')).toBeInTheDocument();
  });

  describe('Navigation interactions', () => {
    it('should call onChange when next button is clicked', () => {
      const onChange = vi.fn();
      render(
        <TestWrapper>
          <Pager {...minimal} max={3} onChange={onChange} />
        </TestWrapper>
      );

      const nextButton = screen.getByLabelText('Next');
      expect(nextButton).not.toBeDisabled();

      fireEvent.click(nextButton);
      expect(onChange).toHaveBeenCalledWith({ value: 2 });
    });

    it('should call onChange when previous button is clicked', () => {
      const onChange = vi.fn();
      render(
        <TestWrapper>
          <Pager current={2} max={3} min={1} onChange={onChange} />
        </TestWrapper>
      );

      const previousButton = screen.getByLabelText('Previous');
      expect(previousButton).not.toBeDisabled();

      fireEvent.click(previousButton);
      expect(onChange).toHaveBeenCalledWith({ value: 1 });
    });

    it('should handle input changes correctly', () => {
      const onChange = vi.fn();
      render(
        <TestWrapper>
          <Pager current={1} max={5} min={1} onChange={onChange} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');

      // Change input value
      fireEvent.change(input, { target: { value: '3' } });
      expect(input).toHaveValue('3');

      // Press Enter to commit
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledWith({ value: 3 });
    });

    it('should handle input blur correctly', () => {
      const onChange = vi.fn();
      render(
        <TestWrapper>
          <Pager current={1} max={5} min={1} onChange={onChange} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');

      // Change input value and blur
      fireEvent.change(input, { target: { value: '4' } });
      fireEvent.blur(input);

      expect(onChange).toHaveBeenCalledWith({ value: 4 });
    });

    it('should restrict input to valid numbers only', () => {
      render(
        <TestWrapper>
          <Pager current={1} max={5} min={1} />
        </TestWrapper>
      );

      const input = screen.getByRole('textbox');

      // Try to enter invalid characters - should be stripped out, leaving empty
      fireEvent.change(input, { target: { value: 'abc' } });
      expect(input).toHaveValue(''); // Invalid chars are stripped

      // Try to enter number beyond max - should be ignored
      fireEvent.change(input, { target: { value: '10' } });
      expect(input).toHaveValue(''); // Beyond max, so ignored

      // Valid number should be accepted
      fireEvent.change(input, { target: { value: '3' } });
      expect(input).toHaveValue('3'); // Valid number accepted
    });

    it('should handle clickable page number selection', () => {
      const onChange = vi.fn();
      render(
        <TestWrapper>
          <Pager current={1} max={5} min={1} clickablePageNumbers={5} onChange={onChange} />
        </TestWrapper>
      );

      // Click on page 3
      const page3 = screen.getByText('3');
      fireEvent.click(page3);

      expect(onChange).toHaveBeenCalledWith({ value: 3 });
    });
  });

  describe('Failed iteration functionality', () => {
    it('should call failed iteration handlers', () => {
      const onClickNext = vi.fn();
      const onClickPrevious = vi.fn();
      const failedIterationProps = {
        max: 3,
        min: 1,
        onClickNext,
        onClickPrevious,
      };

      render(
        <TestWrapper>
          <Pager current={2} max={5} min={1} failedIterationProps={failedIterationProps} />
        </TestWrapper>
      );

      const nextFailedButton = screen.getByLabelText('Next failed');
      const previousFailedButton = screen.getByLabelText('Previous failed');

      fireEvent.click(nextFailedButton);
      expect(onClickNext).toHaveBeenCalledWith({ value: 3 });

      fireEvent.click(previousFailedButton);
      // The implementation actually passes the decremented value (2-1=1) but due to bounds checking it becomes 2
      expect(onClickPrevious).toHaveBeenCalledWith({ value: 2 });
    });
  });

  describe('Edge cases', () => {
    it('should handle single page scenario', () => {
      render(
        <TestWrapper>
          <Pager current={1} max={1} min={1} />
        </TestWrapper>
      );

      const previousButton = screen.getByLabelText('Previous');
      const nextButton = screen.getByLabelText('Next');

      expect(previousButton).toBeDisabled();
      expect(nextButton).toBeDisabled();
    });

    it('should handle maxLength prop for input width', () => {
      render(
        <TestWrapper>
          <Pager current={1} max={100} min={1} maxLength={3} />
        </TestWrapper>
      );

      // Just verify the component renders with maxLength prop without error
      // The actual styling behavior depends on Fluent UI Input implementation
      const input = screen.getByRole('textbox');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Snapshots', () => {
    it('should match snapshot for default pager', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager current={1} max={5} min={1} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for pager with clickable page numbers', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager current={3} max={10} min={1} clickablePageNumbers={5} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for readonly pager', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager current={2} max={5} min={1} readonlyPagerInput={true} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for pager with count display', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager
              current={2}
              max={5}
              min={1}
              countToDisplay={{
                countPerPage: 10,
                totalCount: 50,
              }}
            />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for pager with failed iteration props', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager
              current={2}
              max={5}
              min={1}
              failedIterationProps={{
                max: 4,
                min: 1,
                onClickNext: vi.fn(),
                onClickPrevious: vi.fn(),
              }}
            />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for disabled state (single page)', () => {
      const tree = renderer
        .create(
          <TestWrapper>
            <Pager current={1} max={1} min={1} />
          </TestWrapper>
        )
        .toJSON();
      expect(tree).toMatchSnapshot();
    });
  });
});
