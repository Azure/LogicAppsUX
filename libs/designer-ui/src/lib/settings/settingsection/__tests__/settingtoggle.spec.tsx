import type { SettingToggleProps } from '../settingtoggle';
import { SettingToggle } from '../settingtoggle';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, beforeEach, it, expect, vi } from 'vitest';

describe('ui/settings/settingtoggle', () => {
  let minimal: SettingToggleProps;

  beforeEach(() => {
    minimal = { readOnly: false, checked: false };
  });

  it('should render correctly', () => {
    render(<SettingToggle {...minimal} />);
    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeTruthy();
    expect(switchElement).not.toBeChecked();
  });

  it('should handle toggle changes', async () => {
    const onToggleInputChange = vi.fn();
    render(<SettingToggle {...minimal} onToggleInputChange={onToggleInputChange} />);

    const switchElement = screen.getByRole('switch');
    await userEvent.click(switchElement);

    expect(onToggleInputChange).toHaveBeenCalledTimes(1);
    expect(onToggleInputChange).toHaveBeenCalledWith(expect.any(Object), true);
  });

  it('should be disabled when readOnly is true', () => {
    render(<SettingToggle {...minimal} readOnly={true} />);

    const switchElement = screen.getByRole('switch');
    expect(switchElement).toBeDisabled();
  });

  it('should render custom label', () => {
    const customLabel = <span data-testid="custom-label">Custom Label</span>;
    render(<SettingToggle {...minimal} customLabel={customLabel} />);

    expect(screen.getByTestId('custom-label')).toBeTruthy();
  });

  it('should display on/off text based on checked state', () => {
    const { rerender } = render(<SettingToggle {...minimal} checked={false} />);
    expect(screen.getByText('Off')).toBeTruthy();

    rerender(<SettingToggle {...minimal} checked={true} />);
    expect(screen.getByText('On')).toBeTruthy();
  });
});
