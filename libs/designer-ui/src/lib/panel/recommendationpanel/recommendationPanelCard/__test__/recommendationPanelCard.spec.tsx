import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { RecommendationPanelCard } from '../index';
import type { OperationsData, OperationGroupData } from '../index';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { IntlProvider } from 'react-intl';
import { FavoriteContext } from '@microsoft/logic-apps-shared';

const mockFavoriteContext = {
  isOperationFavorited: vi.fn(() => false),
  onFavoriteClick: vi.fn(),
};

const renderWithProviders = (ui: React.ReactElement) => {
  return render(
    <IntlProvider locale="en">
      <FluentProvider theme={webLightTheme}>
        <FavoriteContext.Provider value={mockFavoriteContext}>{ui}</FavoriteContext.Provider>
      </FluentProvider>
    </IntlProvider>
  );
};

const mockOperationData: OperationsData = {
  type: 'Operation',
  data: {
    id: 'test-operation-id',
    title: 'Test Operation',
    description: 'A test operation',
    apiId: 'test-api-id',
    connectorName: 'Test Connector',
    iconUri: 'https://example.com/icon.svg',
    brandColor: '#0078D4',
  },
};

const mockOperationGroupData: OperationGroupData = {
  type: 'OperationGroup',
  data: {
    connectorName: 'Test Connector Group',
    description: 'A test connector group',
    apiId: 'test-group-api-id',
    iconUri: 'https://example.com/icon.svg',
    brandColor: '#0078D4',
  },
};

describe('RecommendationPanelCard', () => {
  describe('accessibility', () => {
    it('should have tabIndex={0} for keyboard focus', () => {
      const { container } = renderWithProviders(<RecommendationPanelCard operationData={mockOperationData} />);

      const card = container.querySelector('.msla-recommendation-panel-card');
      expect(card).toHaveAttribute('tabindex', '0');
    });

    it('should have role="button"', () => {
      const { container } = renderWithProviders(<RecommendationPanelCard operationData={mockOperationData} />);

      const card = container.querySelector('.msla-recommendation-panel-card');
      expect(card).toHaveAttribute('role', 'button');
    });

    it('should have aria-label with operation title', () => {
      const { container } = renderWithProviders(<RecommendationPanelCard operationData={mockOperationData} />);

      const card = container.querySelector('.msla-recommendation-panel-card');
      expect(card).toHaveAttribute('aria-label', 'Test Operation');
    });
  });

  describe('keyboard interaction', () => {
    it('should call onOperationClick when Enter key is pressed on operation', () => {
      const onOperationClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationData} onOperationClick={onOperationClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onOperationClick).toHaveBeenCalledWith('test-operation-id', 'test-api-id');
    });

    it('should call onOperationClick when Space key is pressed on operation', () => {
      const onOperationClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationData} onOperationClick={onOperationClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      fireEvent.keyDown(card, { key: ' ' });

      expect(onOperationClick).toHaveBeenCalledWith('test-operation-id', 'test-api-id');
    });

    it('should call onConnectorClick when Enter key is pressed on operation group', () => {
      const onConnectorClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationGroupData} onConnectorClick={onConnectorClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      fireEvent.keyDown(card, { key: 'Enter' });

      expect(onConnectorClick).toHaveBeenCalledWith('test-group-api-id');
    });

    it('should not call onClick for other keys', () => {
      const onOperationClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationData} onOperationClick={onOperationClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      fireEvent.keyDown(card, { key: 'Tab' });

      expect(onOperationClick).not.toHaveBeenCalled();
    });
  });

  describe('click interaction', () => {
    it('should call onOperationClick when operation card is clicked', async () => {
      const user = userEvent.setup();
      const onOperationClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationData} onOperationClick={onOperationClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      await user.click(card);

      expect(onOperationClick).toHaveBeenCalledWith('test-operation-id', 'test-api-id');
    });

    it('should call onConnectorClick when operation group card is clicked', async () => {
      const user = userEvent.setup();
      const onConnectorClick = vi.fn();
      const { container } = renderWithProviders(
        <RecommendationPanelCard operationData={mockOperationGroupData} onConnectorClick={onConnectorClick} />
      );

      const card = container.querySelector('.msla-recommendation-panel-card') as HTMLElement;
      await user.click(card);

      expect(onConnectorClick).toHaveBeenCalledWith('test-group-api-id');
    });
  });
});
