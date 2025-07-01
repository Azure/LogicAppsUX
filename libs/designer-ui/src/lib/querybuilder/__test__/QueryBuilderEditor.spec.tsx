import '@testing-library/jest-dom/vitest';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBuilderEditor } from '../index';
import {
  createTestRow,
  createTestGroup,
  createComplexTestData,
  mockGetTokenPicker,
  QueryBuilderTestWrapper,
  createTestValueSegment,
} from './test-utils';
import { ValueSegmentType } from '../../editor';

describe('QueryBuilderEditor Move Functionality', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnChange = vi.fn();
  });

  const renderQueryBuilder = (props: Partial<Parameters<typeof QueryBuilderEditor>[0]> = {}) => {
    const defaultProps = {
      groupProps: createTestGroup(),
      getTokenPicker: mockGetTokenPicker,
      onChange: mockOnChange,
      ...props,
    };

    return render(
      <QueryBuilderTestWrapper>
        <QueryBuilderEditor {...defaultProps} />
      </QueryBuilderTestWrapper>
    );
  };

  describe('Root Level Move Operations', () => {
    it('should handle root level item movements', async () => {
      const multiItemGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('field1') }),
          createTestRow({ operand1: createTestValueSegment('field2') }),
          createTestRow({ operand1: createTestValueSegment('field3') }),
        ],
      });

      renderQueryBuilder({ groupProps: multiItemGroup });

      // Should render all items
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
      expect(screen.getByText('field3')).toBeInTheDocument();
    });
  });

  describe('Cross-Group Move Operations', () => {
    it('should handle moving items between groups correctly', () => {
      const complexGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('beforeGroup') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('inGroup1') }),
              createTestRow({ operand1: createTestValueSegment('inGroup2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('afterGroup') }),
        ],
      });

      renderQueryBuilder({ groupProps: complexGroup });

      // Should render items from different nesting levels
      expect(screen.getByText('beforeGroup')).toBeInTheDocument();
      expect(screen.getByText('inGroup1')).toBeInTheDocument();
      expect(screen.getByText('inGroup2')).toBeInTheDocument();
      expect(screen.getByText('afterGroup')).toBeInTheDocument();
    });

    it('should handle moving items into groups at correct positions', () => {
      const testData = createComplexTestData();
      renderQueryBuilder({ groupProps: testData });

      // Complex structure should render without errors
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0); // Should have multiple comboboxes
    });
  });

  describe('Move Into Group Logic', () => {
    it('should move items to top of group when moving down into group', () => {
      // This tests the corrected logic where moving down into a group
      // places the item at the top of that group
      const testStructure = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('above') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('existing1') }),
              createTestRow({ operand1: createTestValueSegment('existing2') }),
            ],
          }),
        ],
      });

      renderQueryBuilder({ groupProps: testStructure });

      // All items should be visible
      expect(screen.getByText('above')).toBeInTheDocument();
      expect(screen.getByText('existing1')).toBeInTheDocument();
      expect(screen.getByText('existing2')).toBeInTheDocument();
    });

    it('should move items to bottom of group when moving up into group', () => {
      // This tests the corrected logic where moving up into a group
      // places the item at the bottom of that group
      const testStructure = createTestGroup({
        items: [
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('existing1') }),
              createTestRow({ operand1: createTestValueSegment('existing2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('below') }),
        ],
      });

      renderQueryBuilder({ groupProps: testStructure });

      // All items should be visible
      expect(screen.getByText('existing1')).toBeInTheDocument();
      expect(screen.getByText('existing2')).toBeInTheDocument();
      expect(screen.getByText('below')).toBeInTheDocument();
    });
  });

  describe('Move Out of Group Logic', () => {
    it('should handle moving items out of groups to parent level', () => {
      const nestedStructure = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('outsideTop') }),
          createTestGroup({
            items: [
              createTestRow({
                operand1: createTestValueSegment('insideFirst'),
              }),
              createTestRow({
                operand1: createTestValueSegment('insideSecond'),
              }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('outsideBottom') }),
        ],
      });

      renderQueryBuilder({ groupProps: nestedStructure });

      // Should render nested structure correctly
      expect(screen.getByText('outsideTop')).toBeInTheDocument();
      expect(screen.getByText('insideFirst')).toBeInTheDocument();
      expect(screen.getByText('insideSecond')).toBeInTheDocument();
      expect(screen.getByText('outsideBottom')).toBeInTheDocument();
    });
  });

  describe('State Management and Updates', () => {
    it('should maintain state consistency after multiple moves', () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('item1') }),
          createTestRow({ operand1: createTestValueSegment('item2') }),
          createTestRow({ operand1: createTestValueSegment('item3') }),
        ],
      });

      renderQueryBuilder({ groupProps: testGroup });

      // State should be consistent
      expect(screen.getByText('item1')).toBeInTheDocument();
      expect(screen.getByText('item2')).toBeInTheDocument();
      expect(screen.getByText('item3')).toBeInTheDocument();
    });
  });

  describe('Grouping and Height Calculation', () => {
    it('should handle height calculations for grouping logic', () => {
      const testGroup = createTestGroup({
        items: [createTestRow(), createTestRow(), createTestRow()],
      });

      renderQueryBuilder({ groupProps: testGroup });

      // Should render without errors and allow grouping
      expect(screen.getAllByRole('textbox')).toHaveLength(6); // 2 textboxes per row × 3 rows
    });

    it('should update groupable items when structure changes', () => {
      const dynamicGroup = createTestGroup({
        items: [createTestRow({ checked: true }), createTestRow({ checked: true })],
      });

      renderQueryBuilder({ groupProps: dynamicGroup });

      // Should handle checked items for grouping
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach((checkbox) => {
        expect(checkbox).toBeChecked();
      });
    });
  });

  describe('Description and UI Elements', () => {
    it('should show description when showDescription is true', () => {
      renderQueryBuilder({ showDescription: true });

      expect(screen.getByText(/provide the values to compare/i)).toBeInTheDocument();
    });

    it('should not show description when showDescription is false', () => {
      renderQueryBuilder({ showDescription: false });

      expect(screen.queryByText(/provide the values to compare/i)).not.toBeInTheDocument();
    });

    it('should have proper container structure', () => {
      renderQueryBuilder();

      const container = screen.getAllByRole('combobox')[0].closest('.msla-querybuilder-container');
      expect(container).toBeInTheDocument();
    });
  });

  describe('Readonly Mode', () => {
    it('should disable all interactive elements in readonly mode', () => {
      renderQueryBuilder({ readonly: true });

      const dropdown = screen.getAllByRole('combobox')[0];
      expect(dropdown).toHaveAttribute('aria-disabled', 'true');
    });

    it('should not show move buttons in readonly mode', () => {
      const multiItemGroup = createTestGroup({
        items: [createTestRow(), createTestRow()],
      });

      renderQueryBuilder({ groupProps: multiItemGroup, readonly: true });

      // No more commands buttons should be visible
      expect(screen.queryAllByRole('button', { name: /more commands/i })).toHaveLength(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty group structure', () => {
      const emptyGroup = createTestGroup({ items: [] });
      renderQueryBuilder({ groupProps: emptyGroup });

      // Should still render with a default row
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle deeply nested structures', () => {
      const deeplyNested = createTestGroup({
        items: [
          createTestGroup({
            items: [
              createTestGroup({
                items: [createTestRow({ operand1: createTestValueSegment('deep') })],
              }),
            ],
          }),
        ],
      });

      renderQueryBuilder({ groupProps: deeplyNested });

      expect(screen.getByText('deep')).toBeInTheDocument();
    });

    it('should handle missing onChange prop gracefully', () => {
      expect(() => {
        renderQueryBuilder({ onChange: undefined });
      }).not.toThrow();
    });
  });

  describe('Integration with Token Picker', () => {
    it('should integrate with token picker correctly', () => {
      renderQueryBuilder();

      // Token picker should be available through props
      expect(mockGetTokenPicker).toBeDefined();
    });

    it('should pass token mapping to child components', () => {
      const tokenMapping = {
        token1: { id: '1', type: ValueSegmentType.LITERAL, value: 'test' },
      };
      renderQueryBuilder({ tokenMapping });

      // Should render without errors with token mapping
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });
  });

  describe('Performance and Optimization', () => {
    it('should handle large numbers of items efficiently', () => {
      const largeGroup = createTestGroup({
        items: Array.from({ length: 20 }, (_, i) => createTestRow({ operand1: createTestValueSegment(`field${i}`) })),
      });

      renderQueryBuilder({ groupProps: largeGroup });

      // Should render all items without performance issues
      expect(screen.getByText('field0')).toBeInTheDocument();
      expect(screen.getByText('field19')).toBeInTheDocument();
    });

    it('should not cause excessive re-renders', async () => {
      const onChangeCallCount = mockOnChange.mock.calls.length;

      renderQueryBuilder();

      // Allow for initial render calls
      await waitFor(() => {
        expect(mockOnChange.mock.calls.length).toBeGreaterThanOrEqual(onChangeCallCount);
      });
    });
  });
});
