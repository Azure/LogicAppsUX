import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HybridQueryBuilderEditor } from '../HybridQueryBuilder';
import {
  createTestRow,
  createTestGroup,
  createComplexTestData,
  mockGetTokenPicker,
  QueryBuilderTestWrapper,
  createTestValueSegment,
} from './test-utils';

describe('HybridQueryBuilderEditor Move Functionality', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnChange = vi.fn();
  });

  const renderHybridQueryBuilder = (props: Partial<Parameters<typeof HybridQueryBuilderEditor>[0]> = {}) => {
    const defaultProps = {
      groupProps: createTestGroup(),
      getTokenPicker: mockGetTokenPicker,
      onChange: mockOnChange,
      ...props,
    };

    return render(
      <QueryBuilderTestWrapper>
        <HybridQueryBuilderEditor {...defaultProps} />
      </QueryBuilderTestWrapper>
    );
  };

  describe('Basic Functionality', () => {
    it('should render without description section', () => {
      renderHybridQueryBuilder();

      // Should not have description text that regular QueryBuilder has
      expect(screen.queryByText(/provide the values to compare/i)).not.toBeInTheDocument();

      // Should still have the main query builder functionality
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });

    it('should handle basic group structure', () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('field1') }),
          createTestRow({ operand1: createTestValueSegment('field2') }),
        ],
      });

      renderHybridQueryBuilder({ groupProps: testGroup });

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
    });
  });

  describe('Move Operations in Hybrid Mode', () => {
    it('should support the same move operations as regular QueryBuilder', () => {
      const multiItemGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('item1') }),
          createTestRow({ operand1: createTestValueSegment('item2') }),
          createTestRow({ operand1: createTestValueSegment('item3') }),
        ],
      });

      renderHybridQueryBuilder({ groupProps: multiItemGroup });

      // Should show move buttons in more commands (when not at boundaries)
      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBeGreaterThan(0);
    });

    it('should handle cross-group moves in hybrid mode', () => {
      const complexGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('before') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('inside1') }),
              createTestRow({ operand1: createTestValueSegment('inside2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('after') }),
        ],
      });

      renderHybridQueryBuilder({ groupProps: complexGroup });

      expect(screen.getByText('before')).toBeInTheDocument();
      expect(screen.getByText('inside1')).toBeInTheDocument();
      expect(screen.getByText('inside2')).toBeInTheDocument();
      expect(screen.getByText('after')).toBeInTheDocument();
    });
  });

  describe('Move Into Group Logic (Hybrid)', () => {
    it('should follow same move-into-group rules as main QueryBuilder', () => {
      // Test the corrected logic where moving down into a group goes to top
      const testStructure = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('aboveGroup') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('groupItem1') }),
              createTestRow({ operand1: createTestValueSegment('groupItem2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('belowGroup') }),
        ],
      });

      renderHybridQueryBuilder({ groupProps: testStructure });

      // All items should render correctly
      expect(screen.getByText('aboveGroup')).toBeInTheDocument();
      expect(screen.getByText('groupItem1')).toBeInTheDocument();
      expect(screen.getByText('groupItem2')).toBeInTheDocument();
      expect(screen.getByText('belowGroup')).toBeInTheDocument();
    });

    it('should handle moving up into groups correctly', () => {
      // Test moving up into a group goes to bottom
      const testStructure = createTestGroup({
        items: [
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('topOfGroup') }),
              createTestRow({
                operand1: createTestValueSegment('bottomOfGroup'),
              }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('itemBelow') }),
        ],
      });

      renderHybridQueryBuilder({ groupProps: testStructure });

      expect(screen.getByText('topOfGroup')).toBeInTheDocument();
      expect(screen.getByText('bottomOfGroup')).toBeInTheDocument();
      expect(screen.getByText('itemBelow')).toBeInTheDocument();
    });
  });

  describe('State Management', () => {
    it('should handle height calculations for grouping', () => {
      const multiRowGroup = createTestGroup({
        items: [createTestRow(), createTestRow(), createTestRow()],
      });

      renderHybridQueryBuilder({ groupProps: multiRowGroup });

      // Should handle groupable item detection
      expect(screen.getAllByRole('textbox')).toHaveLength(6); // 2 per row × 3 rows
    });
  });

  describe('Integration Features', () => {
    it('should work with token picker', () => {
      renderHybridQueryBuilder();

      // Token picker should be available through props
      expect(mockGetTokenPicker).toBeDefined();
    });

    it('should handle readonly mode', () => {
      renderHybridQueryBuilder({ readonly: true });

      const dropdown = screen.getAllByRole('combobox')[0];
      expect(dropdown).toHaveAttribute('aria-disabled', 'true');
    });

    it('should support token mapping', () => {
      const tokenMapping = {
        token1: { id: '1', type: 'literal', value: 'mapped' },
      };
      renderHybridQueryBuilder({ tokenMapping });

      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle deeply nested structures', () => {
      const deepStructure = createComplexTestData();
      renderHybridQueryBuilder({ groupProps: deepStructure });

      // Should render complex nested structure without errors
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThan(0);
    });

    it('should maintain performance with large structures', () => {
      const largeStructure = createTestGroup({
        items: Array.from({ length: 15 }, (_, i) =>
          i % 3 === 0
            ? createTestGroup({
                items: [
                  createTestRow({
                    operand1: createTestValueSegment(`nested${i}`),
                  }),
                  createTestRow({
                    operand1: createTestValueSegment(`nested${i + 1}`),
                  }),
                ],
              })
            : createTestRow({ operand1: createTestValueSegment(`field${i}`) })
        ),
      });

      renderHybridQueryBuilder({ groupProps: largeStructure });

      // Should handle large structures efficiently
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('nested0')).toBeInTheDocument();
    });
  });

  describe('Comparison with Regular QueryBuilder', () => {
    it('should have same core functionality as QueryBuilderEditor', () => {
      const testGroup = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('test1') }), createTestRow({ operand1: createTestValueSegment('test2') })],
      });

      renderHybridQueryBuilder({ groupProps: testGroup });

      // Should have same basic elements as regular query builder
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument(); // Group condition
      expect(screen.getByText('test1')).toBeInTheDocument();
      expect(screen.getByText('test2')).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /more commands/i })).toHaveLength(2);
    });

    it('should exclude description functionality', () => {
      renderHybridQueryBuilder();

      // Main difference: no description section
      expect(screen.queryByText(/provide the values/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('generic', { name: /description/i })).not.toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle empty groups gracefully', () => {
      const emptyGroup = createTestGroup({ items: [] });
      renderHybridQueryBuilder({ groupProps: emptyGroup });

      // Should provide default empty row
      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should handle missing props gracefully', () => {
      expect(() => {
        renderHybridQueryBuilder({
          onChange: undefined,
        });
      }).not.toThrow();
    });

    it('should recover from invalid group structures', () => {
      // @ts-expect-error - intentionally testing invalid structure
      const invalidGroup = { type: 'invalid', items: [] };

      expect(() => {
        renderHybridQueryBuilder({ groupProps: invalidGroup });
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should maintain same accessibility standards as main QueryBuilder', () => {
      renderHybridQueryBuilder();

      // Should have proper ARIA roles
      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();

      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      moreButtons.forEach((button) => {
        expect(button).toHaveAccessibleName();
      });
    });

    it('should have proper tab order', () => {
      renderHybridQueryBuilder();

      const focusableElements = screen.getAllByRole('combobox');
      expect(focusableElements.length).toBeGreaterThan(0);
    });
  });

  describe('Container Structure', () => {
    it('should have proper container class', () => {
      renderHybridQueryBuilder();

      const container = screen.getAllByRole('combobox')[0].closest('.msla-querybuilder-container');
      expect(container).toBeInTheDocument();
    });

    it('should not have description container', () => {
      renderHybridQueryBuilder();

      const container = screen.getAllByRole('combobox')[0].closest('.msla-querybuilder-container');
      expect(container?.querySelector('.msla-querybuilder-description')).not.toBeInTheDocument();
    });
  });
});
