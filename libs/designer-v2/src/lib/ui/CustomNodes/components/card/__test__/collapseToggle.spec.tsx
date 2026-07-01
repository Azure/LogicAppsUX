// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { CollapseToggle } from '../collapseToggle';

// react-intl's useIntl is already mocked by test-setup.ts via mockUseIntl()

describe('CollapseToggle', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should call handleCollapse with false on a plain click (single level)', () => {
    const handleCollapse = vi.fn();
    render(<CollapseToggle id="scope-toggle" collapsed={false} handleCollapse={handleCollapse} />);

    fireEvent.click(screen.getByRole('button'));

    expect(handleCollapse).toHaveBeenCalledTimes(1);
    expect(handleCollapse).toHaveBeenCalledWith(false);
  });

  it('should call handleCollapse with true on a shift-click (include nested)', () => {
    const handleCollapse = vi.fn();
    render(<CollapseToggle id="scope-toggle" collapsed={false} handleCollapse={handleCollapse} />);

    fireEvent.click(screen.getByRole('button'), { shiftKey: true });

    expect(handleCollapse).toHaveBeenCalledTimes(1);
    expect(handleCollapse).toHaveBeenCalledWith(true);
  });

  it('should stop propagation so the parent card click does not fire', () => {
    const handleCollapse = vi.fn();
    const parentClick = vi.fn();
    render(
      // biome-ignore lint/a11y/useKeyWithClickEvents: test-only wrapper
      <div onClick={parentClick}>
        <CollapseToggle id="scope-toggle" collapsed={false} handleCollapse={handleCollapse} />
      </div>
    );

    fireEvent.click(screen.getByRole('button'), { shiftKey: true });

    expect(handleCollapse).toHaveBeenCalledWith(true);
    expect(parentClick).not.toHaveBeenCalled();
  });
});
