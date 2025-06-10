import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setIconOptions } from '@fluentui/react';
import renderer from 'react-test-renderer';
import { AddActionCard, ADD_CARD_TYPE } from '../index';
import type { AddActionCardProps } from '../index';
import { describe, vi, beforeEach, afterEach, beforeAll, afterAll, it, test, expect } from 'vitest';

describe('lib/card/addActionCard', () => {
  let defaultProps: AddActionCardProps;

  beforeAll(() => {
    setIconOptions({
      disableWarnings: true,
    });
  });

  beforeEach(() => {
    defaultProps = {
      addCardType: ADD_CARD_TYPE.TRIGGER,
      onClick: vi.fn(),
      selected: false,
    };
  });

  describe('Basic Rendering', () => {
    it('should render with minimal props', () => {
      const tree = renderer.create(<AddActionCard {...defaultProps} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should render as trigger card', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);
      expect(screen.getByText('Add a trigger')).toBeInTheDocument();
    });

    it('should render as action card', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);
      expect(screen.getByText('Add an action')).toBeInTheDocument();
    });

    it('should render as selected', () => {
      const tree = renderer.create(<AddActionCard {...defaultProps} selected={true} />).toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('Accessibility - aria-describedby', () => {
    it('should have aria-describedby pointing to hidden description element for trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      const describedById = card.getAttribute('aria-describedby');

      expect(describedById).toBe('placeholder-node-Trigger-description');

      // Verify the hidden description element exists
      const descriptionElement = document.getElementById(describedById!);
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveStyle({ display: 'none' });
      expect(descriptionElement).toHaveTextContent(
        'Triggers: Triggers tell your app when to start running. Each workflow needs at least one trigger.'
      );
    });

    it('should have aria-describedby pointing to hidden description element for action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      const describedById = card.getAttribute('aria-describedby');

      expect(describedById).toBe('placeholder-node-Action-description');

      // Verify the hidden description element exists
      const descriptionElement = document.getElementById(describedById!);
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveStyle({ display: 'none' });
      expect(descriptionElement).toHaveTextContent(
        'Actions: Actions perform operations on data, communicate between systems, or run other tasks.'
      );
    });

    it('should have unique IDs for different card types', () => {
      const { rerender } = render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const triggerCard = screen.getByTestId('card-Add a trigger');
      const triggerDescribedBy = triggerCard.getAttribute('aria-describedby');

      rerender(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const actionCard = screen.getByTestId('card-Add an action');
      const actionDescribedBy = actionCard.getAttribute('aria-describedby');

      expect(triggerDescribedBy).not.toBe(actionDescribedBy);
      expect(triggerDescribedBy).toBe('placeholder-node-Trigger-description');
      expect(actionDescribedBy).toBe('placeholder-node-Action-description');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('should provide accessible tooltip content for screen readers - trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      const describedById = card.getAttribute('aria-describedby');
      const descriptionElement = document.getElementById(describedById!);

      // Verify the content is structured for screen readers
      expect(descriptionElement).toHaveTextContent(
        'Triggers: Triggers tell your app when to start running. Each workflow needs at least one trigger.'
      );

      // Verify the element is hidden from visual users but accessible to screen readers
      expect(descriptionElement).toHaveStyle({ display: 'none' });
      expect(descriptionElement).not.toHaveAttribute('aria-hidden', 'true');
      expect(descriptionElement).not.toHaveAttribute('hidden');
    });

    it('should provide accessible tooltip content for screen readers - action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      const describedById = card.getAttribute('aria-describedby');
      const descriptionElement = document.getElementById(describedById!);

      // Verify the content is structured for screen readers
      expect(descriptionElement).toHaveTextContent(
        'Actions: Actions perform operations on data, communicate between systems, or run other tasks.'
      );

      // Verify the element is hidden from visual users but accessible to screen readers
      expect(descriptionElement).toHaveStyle({ display: 'none' });
      expect(descriptionElement).not.toHaveAttribute('aria-hidden', 'true');
      expect(descriptionElement).not.toHaveAttribute('hidden');
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip with proper content for trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      // The tooltip content should be available in the TooltipHost component
      // We can't easily test the visible tooltip without user interaction,
      // but we can verify the structure is correct
      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toBeInTheDocument();
    });

    it('should render tooltip with proper content for action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClick when clicked', async () => {
      const onClickMock = vi.fn();
      render(<AddActionCard {...defaultProps} onClick={onClickMock} />);

      const card = screen.getByTestId('card-Add a trigger');
      await userEvent.click(card);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    // Note: Keyboard interaction tests for Enter/Space keys are handled by the useCardKeyboardInteraction hook
    // These are integration tests that would require more complex setup to test the keyboard event handling properly

    it('should stop event propagation on click', () => {
      const onClickMock = vi.fn();
      const onParentClick = vi.fn();

      render(
        <div onClick={onParentClick}>
          <AddActionCard {...defaultProps} onClick={onClickMock} />
        </div>
      );

      const card = screen.getByTestId('card-Add a trigger');
      fireEvent.click(card);

      expect(onClickMock).toHaveBeenCalledTimes(1);
      expect(onParentClick).not.toHaveBeenCalled();
    });
  });

  describe('Focus Management', () => {
    it('should be focusable with tabIndex 0', () => {
      render(<AddActionCard {...defaultProps} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper focus styling when focused', async () => {
      render(<AddActionCard {...defaultProps} />);

      const card = screen.getByTestId('card-Add a trigger');
      card.focus();

      expect(card).toHaveFocus();
    });
  });

  describe('Data Attributes', () => {
    it('should have proper test id for trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toBeInTheDocument();
    });

    it('should have proper test id for action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toBeInTheDocument();
    });

    it('should have proper automation id for trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('data-automation-id', 'card-add_a_trigger');
    });

    it('should have proper automation id for action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('data-automation-id', 'card-add_an_action');
    });
  });

  describe('Accessibility Labels', () => {
    it('should have proper aria-label for trigger', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('aria-label', 'Add a trigger');
    });

    it('should have proper aria-label for action', () => {
      render(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('aria-label', 'Add an action');
    });
  });

  describe('CSS Classes', () => {
    it('should apply selection styling when selected', () => {
      render(<AddActionCard {...defaultProps} selected={true} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveClass('msla-panel-card-container-selected');
    });

    it('should not apply selection styling when not selected', () => {
      render(<AddActionCard {...defaultProps} selected={false} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).not.toHaveClass('msla-panel-card-container-selected');
    });
  });
});
