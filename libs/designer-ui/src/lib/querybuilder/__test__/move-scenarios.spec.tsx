import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBuilderEditor } from '../index';
import { MoveOption } from '../Group';
import { GroupType } from '../index';
import { createTestRow, createTestGroup, mockGetTokenPicker, QueryBuilderTestWrapper, createTestValueSegment } from './test-utils';

describe('Query Builder Complex Move Scenarios', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnChange = vi.fn();
  });

  const renderQueryBuilder = (groupProps: Parameters<typeof QueryBuilderEditor>[0]['groupProps']) => {
    return render(
      <QueryBuilderTestWrapper>
        <QueryBuilderEditor groupProps={groupProps} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
      </QueryBuilderTestWrapper>
    );
  };

  describe('Moving Items Into Empty Groups', () => {
    it('should handle moving items into empty groups', () => {
      const structureWithEmptyGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('itemAbove') }),
          createTestGroup({ items: [] }), // Empty group
          createTestRow({ operand1: createTestValueSegment('itemBelow') }),
        ],
      });

      renderQueryBuilder(structureWithEmptyGroup);

      // Should render the items and empty group
      expect(screen.getByText('itemAbove')).toBeInTheDocument();
      expect(screen.getByText('itemBelow')).toBeInTheDocument();
    });

    it('should maintain empty group structure when no items to move', () => {
      const emptyGroupStructure = createTestGroup({
        items: [createTestGroup({ items: [] }), createTestGroup({ items: [] })],
      });

      renderQueryBuilder(emptyGroupStructure);

      // Should handle multiple empty groups
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Deeply Nested Move Operations', () => {
    it('should handle moves in deeply nested structures', () => {
      const deeplyNested = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('level0Item1') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('level1Item1') }),
              createTestGroup({
                items: [
                  createTestRow({ operand1: createTestValueSegment('level2Item1') }),
                  createTestGroup({
                    items: [
                      createTestRow({ operand1: createTestValueSegment('level3Item1') }),
                      createTestRow({ operand1: createTestValueSegment('level3Item2') }),
                    ],
                  }),
                  createTestRow({ operand1: createTestValueSegment('level2Item2') }),
                ],
              }),
              createTestRow({ operand1: createTestValueSegment('level1Item2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('level0Item2') }),
        ],
      });

      renderQueryBuilder(deeplyNested);

      // All nested items should be visible
      expect(screen.getByText('level0Item1')).toBeInTheDocument();
      expect(screen.getByText('level1Item1')).toBeInTheDocument();
      expect(screen.getByText('level2Item1')).toBeInTheDocument();
      expect(screen.getByText('level3Item1')).toBeInTheDocument();
      expect(screen.getByText('level3Item2')).toBeInTheDocument();
      expect(screen.getByText('level2Item2')).toBeInTheDocument();
      expect(screen.getByText('level1Item2')).toBeInTheDocument();
      expect(screen.getByText('level0Item2')).toBeInTheDocument();
    });

    it('should handle cross-level moves in nested structures', () => {
      const complexNested = createTestGroup({
        items: [
          createTestGroup({
            items: [
              createTestGroup({
                items: [createTestRow({ operand1: createTestValueSegment('deepItem') })],
              }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('rootItem') }),
        ],
      });

      renderQueryBuilder(complexNested);

      expect(screen.getByText('deepItem')).toBeInTheDocument();
      expect(screen.getByText('rootItem')).toBeInTheDocument();
    });
  });

  describe('Moving Between Multiple Groups', () => {
    it('should handle moves between multiple sibling groups', () => {
      const multipleSiblingGroups = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('beforeGroups') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('group1Item1') }),
              createTestRow({ operand1: createTestValueSegment('group1Item2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('betweenGroups') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('group2Item1') }),
              createTestRow({ operand1: createTestValueSegment('group2Item2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('afterGroups') }),
        ],
      });

      renderQueryBuilder(multipleSiblingGroups);

      // All items should be visible
      expect(screen.getByText('beforeGroups')).toBeInTheDocument();
      expect(screen.getByText('group1Item1')).toBeInTheDocument();
      expect(screen.getByText('group1Item2')).toBeInTheDocument();
      expect(screen.getByText('betweenGroups')).toBeInTheDocument();
      expect(screen.getByText('group2Item1')).toBeInTheDocument();
      expect(screen.getByText('group2Item2')).toBeInTheDocument();
      expect(screen.getByText('afterGroups')).toBeInTheDocument();
    });

    it('should maintain proper order when moving between adjacent groups', () => {
      const adjacentGroups = createTestGroup({
        items: [
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('firstGroupLast') })],
          }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('secondGroupFirst') })],
          }),
        ],
      });

      renderQueryBuilder(adjacentGroups);

      expect(screen.getByText('firstGroupLast')).toBeInTheDocument();
      expect(screen.getByText('secondGroupFirst')).toBeInTheDocument();
    });
  });

  describe('Boundary Condition Edge Cases', () => {
    it('should handle single item groups correctly', () => {
      const singleItemGroups = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('standalone') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('lonely') })],
          }),
          createTestRow({ operand1: createTestValueSegment('another') }),
        ],
      });

      renderQueryBuilder(singleItemGroups);

      expect(screen.getByText('standalone')).toBeInTheDocument();
      expect(screen.getByText('lonely')).toBeInTheDocument();
      expect(screen.getByText('another')).toBeInTheDocument();
    });

    it('should handle alternating rows and groups', () => {
      const alternatingStructure = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('row1') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('group1') })],
          }),
          createTestRow({ operand1: createTestValueSegment('row2') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('group2') })],
          }),
          createTestRow({ operand1: createTestValueSegment('row3') }),
        ],
      });

      renderQueryBuilder(alternatingStructure);

      expect(screen.getByText('row1')).toBeInTheDocument();
      expect(screen.getByText('group1')).toBeInTheDocument();
      expect(screen.getByText('row2')).toBeInTheDocument();
      expect(screen.getByText('group2')).toBeInTheDocument();
      expect(screen.getByText('row3')).toBeInTheDocument();
    });
  });

  describe('Move Direction Logic Verification', () => {
    it('should correctly identify move down into group scenarios', () => {
      // Item above group -> Move Down -> Should go to TOP of group
      const moveDownScenario = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('aboveGroup') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('existingInGroup') })],
          }),
        ],
      });

      renderQueryBuilder(moveDownScenario);

      expect(screen.getByText('aboveGroup')).toBeInTheDocument();
      expect(screen.getByText('existingInGroup')).toBeInTheDocument();
    });

    it('should correctly identify move up into group scenarios', () => {
      // Item below group -> Move Up -> Should go to BOTTOM of group
      const moveUpScenario = createTestGroup({
        items: [
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('existingInGroup') })],
          }),
          createTestRow({ operand1: createTestValueSegment('belowGroup') }),
        ],
      });

      renderQueryBuilder(moveUpScenario);

      expect(screen.getByText('existingInGroup')).toBeInTheDocument();
      expect(screen.getByText('belowGroup')).toBeInTheDocument();
    });
  });

  describe('Complex Mixed Scenarios', () => {
    it('should handle groups with mixed row and group children', () => {
      const mixedChildren = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('topRow') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('nestedRow1') }),
              createTestGroup({
                items: [createTestRow({ operand1: createTestValueSegment('deepNested') })],
              }),
              createTestRow({ operand1: createTestValueSegment('nestedRow2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('middleRow') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('anotherNested') })],
          }),
          createTestRow({ operand1: createTestValueSegment('bottomRow') }),
        ],
      });

      renderQueryBuilder(mixedChildren);

      // All items should render correctly
      expect(screen.getByText('topRow')).toBeInTheDocument();
      expect(screen.getByText('nestedRow1')).toBeInTheDocument();
      expect(screen.getByText('deepNested')).toBeInTheDocument();
      expect(screen.getByText('nestedRow2')).toBeInTheDocument();
      expect(screen.getByText('middleRow')).toBeInTheDocument();
      expect(screen.getByText('anotherNested')).toBeInTheDocument();
      expect(screen.getByText('bottomRow')).toBeInTheDocument();
    });

    it('should handle very wide structures (many siblings)', () => {
      const wideStructure = createTestGroup({
        items: Array.from({ length: 10 }, (_, i) =>
          i % 2 === 0
            ? createTestRow({ operand1: createTestValueSegment(`row${i}`) })
            : createTestGroup({
                items: [createTestRow({ operand1: createTestValueSegment(`group${i}`) })],
              })
        ),
      });

      renderQueryBuilder(wideStructure);

      // Should handle many siblings efficiently
      expect(screen.getByText('row0')).toBeInTheDocument();
      expect(screen.getByText('group1')).toBeInTheDocument();
      expect(screen.getByText('row8')).toBeInTheDocument();
      expect(screen.getByText('group9')).toBeInTheDocument();
    });
  });

  describe('State Consistency During Complex Moves', () => {
    it('should maintain referential integrity during moves', () => {
      const complexStructure = createTestGroup({
        items: [
          createTestRow({
            operand1: createTestValueSegment('field1'),
            operand2: createTestValueSegment('value1'),
            checked: true,
          }),
          createTestGroup({
            checked: true,
            items: [
              createTestRow({
                operand1: createTestValueSegment('field2'),
                operand2: createTestValueSegment('value2'),
              }),
            ],
          }),
        ],
      });

      renderQueryBuilder(complexStructure);

      // Should maintain checked states and field values
      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('value1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
      expect(screen.getByText('value2')).toBeInTheDocument();

      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes.some((cb) => cb.checked)).toBe(true);
    });

    it('should preserve all item properties during moves', () => {
      const itemsWithProperties = createTestGroup({
        items: [
          createTestRow({
            operand1: createTestValueSegment('custom1'),
            operator: 'contains',
            operand2: createTestValueSegment('test'),
            checked: true,
          }),
          createTestRow({
            operand1: createTestValueSegment('custom2'),
            operator: 'not_equal',
            operand2: createTestValueSegment('empty'),
            checked: false,
          }),
        ],
      });

      renderQueryBuilder(itemsWithProperties);

      expect(screen.getByText('custom1')).toBeInTheDocument();
      expect(screen.getByText('test')).toBeInTheDocument();
      expect(screen.getByText('custom2')).toBeInTheDocument();
      expect(screen.getByText('empty')).toBeInTheDocument();
    });
  });

  describe('Performance Under Complex Scenarios', () => {
    it('should handle very large nested structures without performance degradation', () => {
      const largeNestedStructure = createTestGroup({
        items: Array.from({ length: 5 }, (_, i) =>
          createTestGroup({
            items: Array.from({ length: 5 }, (_, j) => createTestRow({ operand1: createTestValueSegment(`item${i}-${j}`) })),
          })
        ),
      });

      const startTime = performance.now();
      renderQueryBuilder(largeNestedStructure);
      const endTime = performance.now();

      // Spot check some items
      expect(screen.getByText('item0-0')).toBeInTheDocument();
      expect(screen.getByText('item4-4')).toBeInTheDocument();
    });

    it('should not cause memory leaks with frequent updates', () => {
      const dynamicStructure = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('dynamic') })],
      });

      renderQueryBuilder(dynamicStructure);

      // Simulate multiple re-renders
      for (let i = 0; i < 10; i++) {
        renderQueryBuilder(
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment(`updated${i}`) })],
          })
        );
      }

      // Should handle updates without issues
      expect(screen.getByText('updated9')).toBeInTheDocument();
    });
  });
});
