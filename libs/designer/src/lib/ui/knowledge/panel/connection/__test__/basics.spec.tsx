/**
 * @vitest-environment jsdom
 */
import { describe, vi, expect, it, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { basicsTab } from '../tabs/basics';
import type { IntlShape } from 'react-intl';

// Mock closePanel action
const mockClosePanel = vi.fn(() => ({ type: 'knowledgeHubPanel/closePanel' }));
vi.mock('../../../../../core/state/knowledge/panelSlice', () => ({
  closePanel: () => mockClosePanel(),
}));

describe('basicsTab', () => {
  const mockIntl = {
    formatMessage: ({ defaultMessage }: { defaultMessage: string }) => defaultMessage,
  } as IntlShape;

  const mockDispatch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns tab with correct id', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    expect(result.id).toBe('BASICS');
  });

  it('returns tab with correct title', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    expect(result.title).toBe('Basics');
  });

  it('returns tab with disabled state from props', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: true,
      isPrimaryButtonDisabled: false,
    });

    expect(result.disabled).toBe(true);
  });

  it('returns tab with tabStatusIcon from props', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
      tabStatusIcon: 'error',
    });

    expect(result.tabStatusIcon).toBe('error');
  });

  it('returns footerContent with Close and Next buttons', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    expect(result.footerContent.buttonContents).toHaveLength(2);
    expect(result.footerContent.buttonContents[0].text).toBe('Close');
    expect(result.footerContent.buttonContents[1].text).toBe('Next');
  });

  it('Close button dispatches closePanel when clicked', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    result.footerContent.buttonContents[0].onClick?.();

    expect(mockDispatch).toHaveBeenCalledWith({ type: 'knowledgeHubPanel/closePanel' });
  });

  it('Next button calls onPrimaryButtonClick when clicked', () => {
    const mockOnPrimaryButtonClick = vi.fn();
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
      onPrimaryButtonClick: mockOnPrimaryButtonClick,
    });

    result.footerContent.buttonContents[1].onClick?.();

    expect(mockOnPrimaryButtonClick).toHaveBeenCalled();
  });

  it('Next button is disabled when isPrimaryButtonDisabled is true', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: true,
    });

    expect(result.footerContent.buttonContents[1].disabled).toBe(true);
  });

  it('Next button has primary appearance', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    expect(result.footerContent.buttonContents[1].appearance).toBe('primary');
  });

  it('renders Basics content component', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
    });

    render(result.content);

    expect(screen.getByText('Basics Content')).toBeInTheDocument();
  });

  it('Next button onClick handles undefined onPrimaryButtonClick gracefully', () => {
    const result = basicsTab(mockIntl, mockDispatch, {
      isTabDisabled: false,
      isPrimaryButtonDisabled: false,
      onPrimaryButtonClick: undefined,
    });

    // Should not throw when called without onPrimaryButtonClick
    expect(() => result.footerContent.buttonContents[1].onClick?.()).not.toThrow();
  });
});
