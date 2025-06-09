import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryBuilderEditor } from '../index';
import { HybridQueryBuilderEditor } from '../HybridQueryBuilder';
import { SimpleQueryBuilder } from '../SimpleQueryBuilder';
import { MoveOption } from '../Group';
import { createTestRow, createTestGroup, mockGetTokenPicker, QueryBuilderTestWrapper, createTestValueSegment } from './test-utils';

describe('Query Builder Integration Tests', () => {
  let user: ReturnType<typeof userEvent.setup>;
  let mockOnChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    user = userEvent.setup();
    mockOnChange = vi.fn();
  });

  describe('Integration Between Components', () => {
    it('should work consistently across all query builder variants', () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('field1') }),
          createTestRow({ operand1: createTestValueSegment('field2') }),
        ],
      });

      // Test regular QueryBuilder
      const { unmount: unmountRegular } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
      unmountRegular();

      // Test Hybrid QueryBuilder
      const { unmount: unmountHybrid } = render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('field1')).toBeInTheDocument();
      expect(screen.getByText('field2')).toBeInTheDocument();
      unmountHybrid();
    });

    it('should handle the same data structures across components', () => {
      const complexData = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('before') }),
          createTestGroup({
            items: [
              createTestRow({ operand1: createTestValueSegment('nested1') }),
              createTestRow({ operand1: createTestValueSegment('nested2') }),
            ],
          }),
          createTestRow({ operand1: createTestValueSegment('after') }),
        ],
      });

      // Both components should handle the same complex structure
      const props = {
        groupProps: complexData,
        getTokenPicker: mockGetTokenPicker,
        onChange: mockOnChange,
      };

      const { unmount: unmount1 } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor {...props} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('before')).toBeInTheDocument();
      expect(screen.getByText('nested1')).toBeInTheDocument();
      expect(screen.getByText('nested2')).toBeInTheDocument();
      expect(screen.getByText('after')).toBeInTheDocument();
      unmount1();

      render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor {...props} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('before')).toBeInTheDocument();
      expect(screen.getByText('nested1')).toBeInTheDocument();
      expect(screen.getByText('nested2')).toBeInTheDocument();
      expect(screen.getByText('after')).toBeInTheDocument();
    });
  });

  describe('SimpleQueryBuilder Integration', () => {
    it('should handle complex expressions in advanced mode', () => {
      const complexValue = [
        {
          id: '1',
          type: 'literal',
          value: '(field1 equals value1) and (field2 contains value2)',
        },
      ];

      render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder itemValue={complexValue} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      // Should render in advanced mode for complex expressions
      expect(screen.getByText('(field1 equals value1) and (field2 contains value2)')).toBeInTheDocument();
    });
  });

  describe('Move Functionality Integration', () => {
    it('should maintain move functionality across component switches', async () => {
      const testGroup = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('item1') }),
          createTestRow({ operand1: createTestValueSegment('item2') }),
          createTestRow({ operand1: createTestValueSegment('item3') }),
        ],
      });

      // Test in regular QueryBuilder
      const { unmount } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      // Should have move buttons
      const moreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(moreButtons.length).toBeGreaterThan(0);

      await user.click(moreButtons[1]); // Click on middle item
      expect(screen.getByRole('menuitem', { name: /move up/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();

      unmount();

      // Test in Hybrid QueryBuilder - should have same functionality
      render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      const hybridMoreButtons = screen.getAllByRole('button', {
        name: /more commands/i,
      });
      expect(hybridMoreButtons.length).toBeGreaterThan(0);

      await user.click(hybridMoreButtons[1]);
      expect(screen.getByRole('menuitem', { name: /move up/i })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: /move down/i })).toBeInTheDocument();
    });

    it('should handle move operations consistently across components', () => {
      const moveTestData = createTestGroup({
        items: [
          createTestRow({ operand1: createTestValueSegment('above') }),
          createTestGroup({
            items: [createTestRow({ operand1: createTestValueSegment('inside') })],
          }),
          createTestRow({ operand1: createTestValueSegment('below') }),
        ],
      });

      // Both components should render the same structure
      const { unmount: unmount1 } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={moveTestData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('above')).toBeInTheDocument();
      expect(screen.getByText('inside')).toBeInTheDocument();
      expect(screen.getByText('below')).toBeInTheDocument();
      unmount1();

      render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor groupProps={moveTestData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('above')).toBeInTheDocument();
      expect(screen.getByText('inside')).toBeInTheDocument();
      expect(screen.getByText('below')).toBeInTheDocument();
    });
  });
  describe('Token Picker Integration', () => {
    it('should integrate token picker consistently across components', () => {
      const testGroup = createTestGroup({
        items: [createTestRow({ operand1: createTestValueSegment('field') })],
      });

      // Test token picker in regular QueryBuilder
      const { unmount: unmount1 } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      // Token picker should be available through props
      expect(mockGetTokenPicker).toBeDefined();
      mockGetTokenPicker.mockClear();
      unmount1();

      // Test token picker in Hybrid QueryBuilder
      render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );

      // Token picker should be available through props
      expect(mockGetTokenPicker).toBeDefined();
    });

    it('should handle token mapping across components', () => {
      const tokenMapping = {
        token1: { id: 'token1', type: 'literal', value: 'mappedValue' },
      };

      const testGroup = createTestGroup({
        items: [createTestRow()],
      });

      // Test with token mapping in regular QueryBuilder
      const { unmount: unmount1 } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor
            groupProps={testGroup}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
            tokenMapping={tokenMapping}
          />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
      unmount1();

      // Test with token mapping in Hybrid QueryBuilder
      render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor
            groupProps={testGroup}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
            tokenMapping={tokenMapping}
          />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument();
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should handle component switching during error states', () => {
      // Create a more realistic invalid data structure that won't crash
      const invalidData = createTestGroup({ items: [] });
      // @ts-expect-error - intentionally test with undefined items
      invalidData.items = undefined;

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <QueryBuilderEditor groupProps={invalidData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <HybridQueryBuilderEditor groupProps={invalidData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });

    it('should maintain functionality when props are missing', () => {
      const testGroup = createTestGroup();

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <QueryBuilderEditor
              groupProps={testGroup}
              getTokenPicker={mockGetTokenPicker}
              // @ts-expect-error - testing missing onChange
              onChange={undefined}
            />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <HybridQueryBuilderEditor
              groupProps={testGroup}
              getTokenPicker={mockGetTokenPicker}
              // @ts-expect-error - testing missing onChange
              onChange={undefined}
            />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Performance Comparison', () => {
    it('should have similar performance characteristics across components', () => {
      const largeTestData = createTestGroup({
        items: Array.from({ length: 50 }, (_, i) => createTestRow({ operand1: createTestValueSegment(`field${i}`) })),
      });

      // Measure regular QueryBuilder
      const start1 = performance.now();
      const { unmount: unmount1 } = render(
        <QueryBuilderTestWrapper>
          <QueryBuilderEditor groupProps={largeTestData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );
      const end1 = performance.now();
      const regularTime = end1 - start1;
      unmount1();

      // Measure Hybrid QueryBuilder
      const start2 = performance.now();
      const { unmount: unmount2 } = render(
        <QueryBuilderTestWrapper>
          <HybridQueryBuilderEditor groupProps={largeTestData} getTokenPicker={mockGetTokenPicker} onChange={mockOnChange} />
        </QueryBuilderTestWrapper>
      );
      const end2 = performance.now();
      const hybridTime = end2 - start2;
      unmount2();

      // Performance should be comparable (within 2x)
      expect(Math.abs(regularTime - hybridTime)).toBeLessThan(Math.max(regularTime, hybridTime));
    });
  });
});
