import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { InteractionTagList } from '../interactionTagList';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{ui}</FluentProvider>);
};

describe('InteractionTagList', () => {
  const mockItems = [
    { key: 'item-1', text: 'All', value: 'all' },
    { key: 'item-2', text: 'Built-in', value: 'inapp' },
    { key: 'item-3', text: 'Shared', value: 'shared' },
  ];

  it('should render with aria-label on the TagGroup', () => {
    const { container } = renderWithProvider(<InteractionTagList items={mockItems} onTagSelect={vi.fn()} ariaLabel="By Connector" />);

    const tagGroup = container.querySelector('[aria-label="By Connector"]');
    expect(tagGroup).toBeInTheDocument();
  });

  it('should render all tag items', () => {
    renderWithProvider(<InteractionTagList items={mockItems} onTagSelect={vi.fn()} ariaLabel="By Connector" />);

    expect(screen.getByText('All')).toBeInTheDocument();
    expect(screen.getByText('Built-in')).toBeInTheDocument();
    expect(screen.getByText('Shared')).toBeInTheDocument();
  });

  it('should call onTagSelect when a tag is clicked', async () => {
    const user = userEvent.setup();
    const onTagSelect = vi.fn();

    renderWithProvider(<InteractionTagList items={mockItems} onTagSelect={onTagSelect} ariaLabel="By Connector" />);

    await user.click(screen.getByText('Built-in'));

    expect(onTagSelect).toHaveBeenCalledWith('inapp');
  });

  it('should select the first item by default when no initialSelectedItem is provided', () => {
    const { container } = renderWithProvider(<InteractionTagList items={mockItems} onTagSelect={vi.fn()} ariaLabel="By Connector" />);

    const allButton = container.querySelector('[data-automation-id="all"]');
    expect(allButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('should select the initialSelectedItem when provided', () => {
    const { container } = renderWithProvider(
      <InteractionTagList items={mockItems} onTagSelect={vi.fn()} ariaLabel="By Connector" initialSelectedItem="shared" />
    );

    const sharedButton = container.querySelector('[data-automation-id="shared"]');
    expect(sharedButton).toHaveAttribute('aria-pressed', 'true');
  });
});
