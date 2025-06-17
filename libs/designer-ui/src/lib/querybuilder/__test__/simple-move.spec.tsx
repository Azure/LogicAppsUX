import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Row } from '../Row';
import { Group } from '../Group';
import { QueryBuilderEditor } from '../index';
import { createTestRow, createTestGroup, mockGetTokenPicker, QueryBuilderTestWrapper, createTestValueSegment } from './test-utils';

describe('Query Builder Move Functionality - Simplified Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Row Move Buttons', () => {
    it('should render move buttons when not at boundaries', async () => {
      const mockHandlers = {
        handleMove: vi.fn(),
        handleDeleteChild: vi.fn(),
        handleUpdateParent: vi.fn(),
      };

      render(
        <QueryBuilderTestWrapper>
          <Row
            {...createTestRow()}
            index={1}
            isTop={false}
            isBottom={false}
            groupedItems={[]}
            getTokenPicker={mockGetTokenPicker}
            {...mockHandlers}
          />
        </QueryBuilderTestWrapper>
      );

      const moreButton = screen.getByRole('button', { name: /more commands/i });
      await user.click(moreButton);

      expect(screen.getByRole('menuitem', { name: /move up/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();
    });

    it('should disable move up when at top', async () => {
      const mockHandlers = {
        handleMove: vi.fn(),
        handleDeleteChild: vi.fn(),
        handleUpdateParent: vi.fn(),
      };

      render(
        <QueryBuilderTestWrapper>
          <Row
            {...createTestRow()}
            index={0}
            isTop={true}
            isBottom={false}
            groupedItems={[]}
            getTokenPicker={mockGetTokenPicker}
            {...mockHandlers}
          />
        </QueryBuilderTestWrapper>
      );

      const moreButton = screen.getByRole('button', { name: /more commands/i });
      await user.click(moreButton);

      const moveUpButton = screen.getByRole('menuitem', { name: /move up/i });
      expect(moveUpButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should disable move down when at bottom', async () => {
      const mockHandlers = {
        handleMove: vi.fn(),
        handleDeleteChild: vi.fn(),
        handleUpdateParent: vi.fn(),
      };

      render(
        <QueryBuilderTestWrapper>
          <Row
            {...createTestRow()}
            index={2}
            isTop={false}
            isBottom={true}
            groupedItems={[]}
            getTokenPicker={mockGetTokenPicker}
            {...mockHandlers}
          />
        </QueryBuilderTestWrapper>
      );

      const moreButton = screen.getByRole('button', { name: /more commands/i });
      await user.click(moreButton);

      const moveDownButton = screen.getByRole('menuitem', {
        name: /move down/i,
      });
      expect(moveDownButton).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Group Move Buttons', () => {
    it('should not show group-level controls for root groups', () => {
      const mockHandlers = {
        handleMove: vi.fn(),
        handleDeleteChild: vi.fn(),
        handleUpdateParent: vi.fn(),
        handleUngroupChild: vi.fn(),
      };

      render(
        <QueryBuilderTestWrapper>
          <Group
            groupProps={createTestGroup({ items: [] })}
            index={0}
            isRootGroup={true}
            isGroupable={true}
            groupedItems={[]}
            isTop={true}
            isBottom={true}
            getTokenPicker={mockGetTokenPicker}
            {...mockHandlers}
          />
        </QueryBuilderTestWrapper>
      );

      // Root groups should not show collapse button
      expect(screen.queryByRole('button', { name: /collapse/i })).not.toBeInTheDocument();

      // Check that group control bar is empty (no group-level More commands button)
      const groupControlBar = document.querySelector('.msla-querybuilder-group-controlbar');
      expect(groupControlBar?.children).toHaveLength(0);
    });

    it('should show move buttons for non-root groups', async () => {
      const mockHandlers = {
        handleMove: vi.fn(),
        handleDeleteChild: vi.fn(),
        handleUpdateParent: vi.fn(),
        handleUngroupChild: vi.fn(),
      };

      render(
        <QueryBuilderTestWrapper>
          <Group
            groupProps={createTestGroup({ items: [] })}
            index={1}
            isRootGroup={false}
            isGroupable={true}
            groupedItems={[]}
            isTop={false}
            isBottom={false}
            getTokenPicker={mockGetTokenPicker}
            {...mockHandlers}
          />
        </QueryBuilderTestWrapper>
      );

      // Should have collapse button and more commands button
      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBeGreaterThan(0);

      await user.click(moreButtons[0]);

      expect(screen.getByRole('menuitem', { name: /move up/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();
    });
  });

  describe('QueryBuilder Integration', () => {
    it('should render basic structure correctly', () => {
      const testGroup = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('field1') })],
      });

      render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={vi.fn()} />
        </QueryBuilderTestWrapper>
      );

      // The value segment editor renders the actual value as text content
      expect(screen.getByText('field1')).toBeInTheDocument();

      // Should have both group condition dropdown and operator dropdown
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(1);
    });

    it('should handle multiple rows correctly', () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('field1') }),
          createTestRow({ operand1: createTestValueSegment('field2') }),
        ],
      });

      render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={vi.fn()} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();

      // Should have move buttons for both rows
      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBe(2); // One for each row
    });

    it('should work in readonly mode', () => {
      const testGroup = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('field1') })],
      });

      render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={vi.fn()} readonly={true} />
        </QueryBuilderTestWrapper>
      );

      // Should have disabled dropdowns in readonly mode (Fluent UI uses aria-disabled)
      const dropdowns = screen.getAllByRole('combobox');
      expect(dropdowns.length).toBeGreaterThan(0);
      expect(dropdowns[0]).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Move Logic Verification', () => {
    it('should handle move operations without crashing', async () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('first') }),
          createTestRow({ operand1: createTestValueSegment('second') }),
        ],
      });

      const mockOnChange = vi.fn();

      render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      // Should render both items
      expect(screen.getByText('first')).toBeInTheDocument();
      expect(screen.getByText('second')).toBeInTheDocument();

      // Try to interact with move buttons
      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBe(2);

      // Click on the first row's more button
      await user.click(moreButtons[0]);

      // Should show move options
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();

      // Move up should be disabled for first item
      const moveUpButton = screen.getByRole('menuitem', { name: /move up/i });
      expect(moveUpButton).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show correct button states for last item', async () => {
      const testGroup = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('first') }), createTestRow({ operand1: createTestValueSegment('last') })],
      });

      render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={vi.fn()} />
        </QueryBuilderTestWrapper>
      );

      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });

      // Click on the last row's more button
      await user.click(moreButtons[1]);

      // Move down should be disabled for last item
      const moveDownButton = screen.getByRole('menuitem', {
        name: /move down/i,
      });
      expect(moveDownButton).toHaveAttribute('aria-disabled', 'true');

      // Move up should be enabled
      const moveUpButton = screen.getByRole('menuitem', { name: /move up/i });
      expect(moveUpButton).not.toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing move handlers gracefully', () => {
      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <Row
              {...createTestRow()}
              index={0}
              isTop={false}
              isBottom={false}
              groupedItems={[]}
              getTokenPicker={mockGetTokenPicker}
              handleMove={undefined}
              handleDeleteChild={vi.fn()}
              handleUpdateParent={vi.fn()}
            />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });

    it('should render with empty data gracefully', () => {
      const emptyGroup = createTestGroup({ items: [] });

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <QueryBuilderEditor groupProps={emptyGroup} getTokenPicker={mockGetTokenPicker} onChange={vi.fn()} />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });
  });
});
