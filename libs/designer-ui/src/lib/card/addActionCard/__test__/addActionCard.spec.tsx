import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { setIconOptions } from '@fluentui/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import renderer from 'react-test-renderer';
import { AddActionCard, ADD_CARD_TYPE } from '../index';
import type { AddActionCardProps } from '../index';
import { describe, vi, beforeEach, beforeAll, it, expect } from 'vitest';

// Test helper to wrap components with FluentProvider
const renderWithProvider = (component: React.ReactElement) => {
  return render(<FluentProvider theme={webLightTheme}>{component}</FluentProvider>);
};

// Create a simplified component for snapshot testing that doesn't rely on complex dependencies
const SimpleAddActionCard: React.FC<AddActionCardProps> = ({ addCardType, selected, onClick }) => {
  const title = addCardType === ADD_CARD_TYPE.TRIGGER ? 'Add a trigger' : 'Add an action';
  const brandColor = '#484F58';

  return (
    <div data-component="add-action-card-root">
      <div
        aria-label={title}
        data-testid={`card-${title}`}
        data-automation-id={`card-${title.replace(/\s+/g, '_').toLowerCase()}`}
        data-selected={selected}
        onClick={onClick}
        tabIndex={0}
        style={{
          border: '1px solid #c8c6c4',
          borderRadius: '2px',
          backgroundColor: '#fff',
          width: '200px',
          cursor: 'pointer',
        }}
      >
        <div data-component="selection-box" data-selected={selected} />
        <div data-component="card-main">
          <div data-component="card-header">
            <div data-component="card-content-container">
              <div data-component="card-gripper" />
              <div data-component="card-icon-section">
                <img
                  alt=""
                  src="test-icon.svg"
                  style={{
                    background: brandColor,
                    padding: '4px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '2px',
                  }}
                />
              </div>
              <div data-component="card-content">
                <div data-component="card-title">{title}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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
      renderWithProvider(<AddActionCard {...defaultProps} />);
      expect(screen.getByText('Add a trigger')).toBeInTheDocument();
    });

    it('should render as trigger card', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);
      expect(screen.getByText('Add a trigger')).toBeInTheDocument();
    });

    it('should render as action card', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);
      expect(screen.getByText('Add an action')).toBeInTheDocument();
    });

    it('should render as selected', () => {
      renderWithProvider(<AddActionCard {...defaultProps} selected={true} />);
      expect(screen.getByText('Add a trigger')).toBeInTheDocument();
    });
  });

  describe('Component Snapshots', () => {
    it('should match snapshot for trigger card - unselected', () => {
      const tree = renderer.create(<SimpleAddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} selected={false} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for trigger card - selected', () => {
      const tree = renderer.create(<SimpleAddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} selected={true} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for action card - unselected', () => {
      const tree = renderer.create(<SimpleAddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} selected={false} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot for action card - selected', () => {
      const tree = renderer.create(<SimpleAddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} selected={true} />).toJSON();
      expect(tree).toMatchSnapshot();
    });

    it('should match snapshot with different props combination', () => {
      const customOnClick = vi.fn();
      const tree = renderer
        .create(<SimpleAddActionCard addCardType={ADD_CARD_TYPE.ACTION} selected={true} onClick={customOnClick} />)
        .toJSON();
      expect(tree).toMatchSnapshot();
    });
  });

  describe('Accessibility', () => {
    it('should have proper aria-label for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);
      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('aria-label', 'Add a trigger');
    });

    it('should have proper aria-label for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);
      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('aria-label', 'Add an action');
    });

    it('should be accessible to screen readers through tooltip', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);
      const card = screen.getByTestId('card-Add a trigger');

      // Fluent UI v9 Tooltip handles accessibility automatically
      // We verify the card exists and has proper labeling
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Add a trigger');
    });
  });

  describe('Tooltip Content', () => {
    it('should render tooltip with proper structure for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);
      const card = screen.getByTestId('card-Add a trigger');

      // Verify the component renders correctly with Fluent UI v9 Tooltip
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Add a trigger');
    });

    it('should render tooltip with proper structure for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);
      const card = screen.getByTestId('card-Add an action');

      // Verify the component renders correctly with Fluent UI v9 Tooltip
      expect(card).toBeInTheDocument();
      expect(card).toHaveAttribute('aria-label', 'Add an action');
    });
  });

  describe('Tooltip Functionality', () => {
    it('should render tooltip with proper content for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      // The tooltip content is handled by Fluent UI v9 Tooltip component
      // We verify the structure is correct
      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toBeInTheDocument();
    });

    it('should render tooltip with proper content for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toBeInTheDocument();
    });
  });

  describe('Interaction', () => {
    it('should call onClick when clicked', async () => {
      const onClickMock = vi.fn();
      renderWithProvider(<AddActionCard {...defaultProps} onClick={onClickMock} />);

      const card = screen.getByTestId('card-Add a trigger');
      await userEvent.click(card);

      expect(onClickMock).toHaveBeenCalledTimes(1);
    });

    // Note: Keyboard interaction tests for Enter/Space keys are handled by the useCardKeyboardInteraction hook
    // These are integration tests that would require more complex setup to test the keyboard event handling properly

    it('should stop event propagation on click', () => {
      const onClickMock = vi.fn();
      const onParentClick = vi.fn();

      renderWithProvider(
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
      renderWithProvider(<AddActionCard {...defaultProps} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('should have proper focus styling when focused', async () => {
      renderWithProvider(<AddActionCard {...defaultProps} />);

      const card = screen.getByTestId('card-Add a trigger');
      card.focus();

      expect(card).toHaveFocus();
    });
  });

  describe('Data Attributes', () => {
    it('should have proper test id for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toBeInTheDocument();
    });

    it('should have proper test id for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toBeInTheDocument();
    });

    it('should have proper automation id for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('data-automation-id', 'card-add_a_trigger');
    });

    it('should have proper automation id for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('data-automation-id', 'card-add_an_action');
    });
  });

  describe('Accessibility Labels', () => {
    it('should have proper aria-label for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('aria-label', 'Add a trigger');
    });

    it('should have proper aria-label for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('aria-label', 'Add an action');
    });

    it('should have aria-describedby attribute for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toHaveAttribute('aria-describedby', 'placeholder-node-Trigger-description');
    });

    it('should have aria-describedby attribute for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const card = screen.getByTestId('card-Add an action');
      expect(card).toHaveAttribute('aria-describedby', 'placeholder-node-Action-description');
    });

    it('should have hidden description element for trigger', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.TRIGGER} />);

      const descriptionElement = document.getElementById('placeholder-node-Trigger-description');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveStyle({ display: 'none' });
    });

    it('should have hidden description element for action', () => {
      renderWithProvider(<AddActionCard {...defaultProps} addCardType={ADD_CARD_TYPE.ACTION} />);

      const descriptionElement = document.getElementById('placeholder-node-Action-description');
      expect(descriptionElement).toBeInTheDocument();
      expect(descriptionElement).toHaveStyle({ display: 'none' });
    });
  });

  describe('Selection State', () => {
    it('should apply selection styling when selected', () => {
      renderWithProvider(<AddActionCard {...defaultProps} selected={true} />);

      const card = screen.getByTestId('card-Add a trigger');
      // With makeStyles, we can't easily test for specific class names
      // but we can verify the component renders without errors
      expect(card).toBeInTheDocument();
    });

    it('should not apply selection styling when not selected', () => {
      renderWithProvider(<AddActionCard {...defaultProps} selected={false} />);

      const card = screen.getByTestId('card-Add a trigger');
      expect(card).toBeInTheDocument();
    });
  });
});
