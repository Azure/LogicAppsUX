import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { ConnectorSummaryCard } from '../index';
import type { Connector } from '@microsoft/logic-apps-shared';
import { FavoriteContext } from '@microsoft/logic-apps-shared';

const mockConnector: Connector = {
  id: 'test-connector-id',
  name: 'testConnector',
  type: 'Microsoft.Web/locations/managedApis',
  properties: {
    displayName: 'Test Connector',
    description: 'A test connector for unit tests',
    iconUri: 'https://example.com/icon.svg',
  },
};

const mockFavoriteContext = {
  isOperationFavorited: vi.fn(() => false),
  onFavoriteClick: vi.fn(),
};

const renderWithProvider = (ui: React.ReactElement) => {
  return render(<FavoriteContext.Provider value={mockFavoriteContext}>{ui}</FavoriteContext.Provider>);
};

describe('ConnectorSummaryCard', () => {
  describe('accessibility', () => {
    it('should have tabIndex={0} for keyboard focus', () => {
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('should have role="button"', () => {
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should have aria-label with connector name', () => {
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} />);

      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('aria-label', 'Test Connector');
    });
  });

  describe('keyboard interaction', () => {
    it('should call onClick when Enter key is pressed', async () => {
      const onClick = vi.fn();
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onClick).toHaveBeenCalledWith('test-connector-id');
    });

    it('should call onClick when Space key is pressed', async () => {
      const onClick = vi.fn();
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: ' ' });

      expect(onClick).toHaveBeenCalledWith('test-connector-id');
    });

    it('should not call onClick for other keys', () => {
      const onClick = vi.fn();
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} onClick={onClick} />);

      const card = screen.getByRole('button');
      fireEvent.keyDown(card, { key: 'Tab' });

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('click interaction', () => {
    it('should call onClick when clicked', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      renderWithProvider(<ConnectorSummaryCard connector={mockConnector} displayRuntimeInfo={false} onClick={onClick} />);

      await user.click(screen.getByRole('button'));

      expect(onClick).toHaveBeenCalledWith('test-connector-id');
    });
  });
});
