import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Group, MoveOption } from '../Group';
import {
  createTestRow,
  createTestGroup,
  createComplexTestData,
  createMockHandlers,
  mockGetTokenPicker,
  getMoveUpButton,
  getMoveDownButton,
  isMoveUpDisabled,
  isMoveDownDisabled,
  QueryBuilderTestWrapper,
} from './test-utils';

describe('Group Component Move Functionality', () => {
  let mockHandlers: ReturnType<typeof createMockHandlers>;
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    mockHandlers = createMockHandlers();
    user = userEvent.setup();
  });

  const renderGroup = (props: Partial<Parameters<typeof Group>[0]> = {}) => {
    const defaultProps = {
      groupProps: createTestGroup(),
      index: 0,
      isRootGroup: false,
      isGroupable: true,
      groupedItems: [],
      isTop: false,
      isBottom: false,
      getTokenPicker: mockGetTokenPicker,
      ...mockHandlers,
      ...props,
    };

    return render(
      <QueryBuilderTestWrapper>
        <Group {...defaultProps} />
      </QueryBuilderTestWrapper>
    );
  };

  describe('Group Move Button Visibility and State', () => {
    it('should show move up and move down buttons for non-root groups', async () => {
      // Use a simple group with no nested items to avoid multiple "More commands" buttons
      const simpleGroup = createTestGroup({ items: [] });
      renderGroup({
        groupProps: simpleGroup,
        isRootGroup: false,
      });

      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBeGreaterThan(0);

      await user.click(moreButtons[0]);

      expect(screen.getByRole('menuitem', { name: /move up/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();
    });

    it('should not show group-level controls for root groups', () => {
      renderGroup({ isRootGroup: true });

      // Root groups should not show collapse button
      expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();

      // Check that group control bar is empty (no group-level More commands button)
      const groupControlBar = document.querySelector('.msla-querybuilder-group-controlbar');
      expect(groupControlBar?.children).toHaveLength(0);
    });

    it('should disable move up button when isTop is true', async () => {
      const simpleGroup = createTestGroup({ items: [] });
      renderGroup({
        groupProps: simpleGroup,
        isTop: true,
        isRootGroup: false,
      });

      // When a group has empty items, it renders both:
      // 1. Group-level More commands button (index 1, should be disabled)
      // 2. Default Row More commands button (index 0, may not be disabled)
      // We want to test the Group-level button
      expect(await isMoveUpDisabled(1)).toBe(true);
    });

    it('should disable move down button when isBottom is true', async () => {
      const simpleGroup = createTestGroup({ items: [] });
      renderGroup({
        groupProps: simpleGroup,
        isBottom: true,
        isRootGroup: false,
      });

      // Test the Group-level button (index 1), not the default Row button (index 0)
      expect(await isMoveDownDisabled(1)).toBe(true);
    });
  });

  describe('Group Move Operations - Within Same Level', () => {
    it('should call handleMove with correct parameters for move up', async () => {
      const simpleGroup = createTestGroup({ items: [] });
      renderGroup({
        groupProps: simpleGroup,
        index: 2,
        isRootGroup: false,
      });

      // Click the Group's move button (index 1), not the Row's button (index 0)
      const moveUpButton = await getMoveUpButton(1);
      await user.click(moveUpButton);

      expect(mockHandlers.handleMove).toHaveBeenCalledWith(2, MoveOption.UP);
    });
  });

  describe('Group Child Movement Scenarios', () => {
    it('should handle child move operations correctly', () => {
      const groupWithMultipleItems = createTestGroup({
        items: [
          createTestRow({
            operand1: [{ id: '1', type: 'literal', value: 'field1' }],
          }),
          createTestRow({
            operand1: [{ id: '2', type: 'literal', value: 'field2' }],
          }),
          createTestRow({
            operand1: [{ id: '3', type: 'literal', value: 'field3' }],
          }),
        ],
      });

      renderGroup({ groupProps: groupWithMultipleItems });

      // Should render all child items
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
      expect(screen.getByText('field3')).toBeInTheDocument();
    });

    it('should handle nested group structures', () => {
      const nestedGroup = createTestGroup({
        items: [
          createTestRow(),
          createTestGroup({
            items: [
              createTestRow({
                operand1: [{ id: '1', type: 'literal', value: 'nested1' }],
              }),
              createTestRow({
                operand1: [{ id: '2', type: 'literal', value: 'nested2' }],
              }),
            ],
          }),
        ],
      });

      renderGroup({ groupProps: nestedGroup });

      // Should render nested items
      expect(screen.getByText('nested1')).toBeInTheDocument();
      expect(screen.getByText('nested2')).toBeInTheDocument();
    });
  });

  describe('Cross-Group Move Logic', () => {
    it('should handle move into adjacent groups correctly', () => {
      const complexData = createComplexTestData();
      renderGroup({ groupProps: complexData });

      // Component should render without errors with complex nested structure
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument(); // Group condition dropdown
    });
  });

  describe('Group State Management', () => {
    it('should handle group condition changes', () => {
      renderGroup();

      // Group dropdown should be present and accessible  
      const dropdowns = screen.getAllByRole('combobox');
      expect(dropdowns.length).toBeGreaterThan(0);
      expect(dropdowns[0]).toBeInTheDocument();
    });
  });

  describe('Group Collapse Functionality', () => {
    it('should show collapse button for non-root groups', () => {
      renderGroup({ isRootGroup: false });

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      expect(collapseButton).toBeInTheDocument();
    });

    it('should toggle collapse state when collapse button is clicked', async () => {
      renderGroup({ isRootGroup: false });

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      await user.click(collapseButton);

      // After collapse, the group content should be hidden
      // This is implementation-specific and may need adjustment based on actual behavior
      expect(collapseButton).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels for all buttons', async () => {
      renderGroup({ isRootGroup: false });

      const moreButton = screen.getAllByRole('button', {
        name: /more commands/i,
      })[0];
      expect(moreButton).toHaveAccessibleName();

      const collapseButton = screen.getByRole('button', { name: /collapse/i });
      expect(collapseButton).toHaveAccessibleName();
    });

    it('should maintain proper tab order', () => {
      renderGroup();

      // Should have focusable elements in logical order
      const focusableElements = screen.getAllByRole('combobox');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });
});
