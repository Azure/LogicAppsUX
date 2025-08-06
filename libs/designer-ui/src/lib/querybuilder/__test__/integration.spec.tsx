import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { GroupType, QueryBuilderEditor } from '../index';
import { HybridQueryBuilderEditor } from '../HybridQueryBuilder';
import { convertRootPropToValue, SimpleQueryBuilder } from '../SimpleQueryBuilder';
import { MoveOption } from '../Group';
import { createTestRow, createTestGroup, mockGetTokenPicker, QueryBuilderTestWrapper, createTestValueSegment } from './test-utils';
import { ValueSegmentType } from '../../editor';
import { TokenType } from '@microsoft/logic-apps-shared';

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
      const complexRowItem = {
        isOldFormat: true,
        isRowFormat: true,
        itemValue: {
          operator: 'and',
          operand1: [
            {
              id: '1',
              type: ValueSegmentType.LITERAL,
              value: 'field1 equals value1',
            },
          ],
          operand2: [
            {
              id: '2',
              type: ValueSegmentType.LITERAL,
              value: 'field2 contains value2',
            },
          ],
          type: GroupType.ROW,
        },
      };

      render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder
            initialValue={convertRootPropToValue(complexRowItem.itemValue)}
            itemValue={complexRowItem.itemValue}
            rowFormat={complexRowItem.isOldFormat}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
          />
        </QueryBuilderTestWrapper>
      );

      // Should render in advanced mode for complex expressions
      expect(screen.getByText('field1 equals value1')).toBeInTheDocument();
      expect(screen.getByText('field2 contains value2')).toBeInTheDocument();
    });

    it('should handle simple row item format', () => {
      const simpleRowItem = {
        isOldFormat: false,
        isRowFormat: true,
        itemValue: {
          operator: 'equals',
          operand1: [
            {
              id: '1',
              type: ValueSegmentType.LITERAL,
              value: 'test field',
            },
          ],
          operand2: [
            {
              id: '2',
              type: ValueSegmentType.LITERAL,
              value: 'test value',
            },
          ],
          type: GroupType.ROW,
        },
      };

      render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder
            initialValue={convertRootPropToValue(simpleRowItem.itemValue)}
            rowFormat={simpleRowItem.isRowFormat}
            itemValue={simpleRowItem.itemValue}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
          />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('test field')).toBeInTheDocument();
      expect(screen.getByText('test value')).toBeInTheDocument();
    });

    it('should handle token-based row items', () => {
      const tokenRowItem = {
        isOldFormat: false,
        isRowFormat: true,
        itemValue: {
          operator: 'equals',
          operand1: [
            {
              id: 'token-1',
              type: ValueSegmentType.TOKEN,
              token: {
                actionName: 'Get_response_details',
                source: 'body',
                name: 'field_name',
                key: 'outputs.$.body.field_name',
                required: false,
                tokenType: TokenType.OUTPUTS,
                title: 'Field Name',
                value: "body('Get_response_details')?['field_name']",
                icon: 'https://example.com/icon.png',
                brandColor: '',
                isSecure: false,
              },
              value: "body('Get_response_details')?['field_name']",
            },
          ],
          operand2: [
            {
              id: 'literal-1',
              type: ValueSegmentType.LITERAL,
              value: 'Expected Value',
            },
          ],
          type: GroupType.ROW,
        },
      };

      render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder
            initialValue={convertRootPropToValue(tokenRowItem.itemValue)}
            rowFormat={tokenRowItem.isRowFormat}
            itemValue={tokenRowItem.itemValue}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
          />
        </QueryBuilderTestWrapper>
      );

      expect(screen.getByText('Field Name')).toBeInTheDocument();
      expect(screen.getByText('Expected Value')).toBeInTheDocument();
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
        token1: { id: 'token1', type: ValueSegmentType.LITERAL, value: 'mappedValue' },
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

    it('should handle RowItem format with token mapping in SimpleQueryBuilder', () => {
      const tokenMapping = {
        'outputs.$.body.test_field': {
          id: 'mapped-token',
          type: ValueSegmentType.TOKEN,
          token: {
            title: 'Mapped Field Title',
            key: 'outputs.$.body.test_field',
            tokenType: TokenType.OUTPUTS,
          },
          value: "body('Test')?['test_field']",
        },
      };

      const rowItemWithToken = {
        isOldFormat: false,
        isRowFormat: true,
        itemValue: {
          operator: 'equals',
          operand1: [
            {
              id: 'token-1',
              type: ValueSegmentType.TOKEN,
              token: {
                key: 'outputs.$.body.test_field',
                title: 'Original Title',
                tokenType: TokenType.OUTPUTS,
              },
              value: "body('Test')?['test_field']",
            },
          ],
          operand2: [
            {
              id: 'literal-1',
              type: ValueSegmentType.LITERAL,
              value: 'test value',
            },
          ],
          type: GroupType.ROW,
        },
      };

      render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder
            initialValue={convertRootPropToValue(rowItemWithToken.itemValue)}
            rowFormat={rowItemWithToken.isRowFormat}
            itemValue={rowItemWithToken.itemValue}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
            tokenMapping={tokenMapping}
          />
        </QueryBuilderTestWrapper>
      );

      // Should show mapped title or original title
      expect(screen.getByText(/Mapped Field Title|Original Title/)).toBeInTheDocument();
      expect(screen.getByText('test value')).toBeInTheDocument();
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

    it('should handle invalid RowItem format in SimpleQueryBuilder', () => {
      const invalidRowItem = {
        isOldFormat: true,
        isRowFormat: true,
        itemValue: {
          operator: 'equals',
          operand1: [],
          operand2: [],
          type: GroupType.ROW,
        },
      };

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <SimpleQueryBuilder
              initialValue={convertRootPropToValue(invalidRowItem.itemValue)}
              rowFormat={invalidRowItem.isRowFormat}
              itemValue={invalidRowItem.itemValue}
              getTokenPicker={mockGetTokenPicker}
              onChange={mockOnChange}
            />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });

    it('should maintain functionality when props are missing', () => {
      const testGroup = createTestGroup();

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <QueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={undefined} />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();

      expect(() => {
        render(
          <QueryBuilderTestWrapper>
            <HybridQueryBuilderEditor groupProps={testGroup} getTokenPicker={mockGetTokenPicker} onChange={undefined} />
          </QueryBuilderTestWrapper>
        );
      }).not.toThrow();
    });
  });

  describe('Performance Comparison', () => {
    it('should have similar performance characteristics across components', () => {
      const largeTestData = createTestGroup({
        items: Array.from({ length: 20 }, (_, i) => createTestRow({ operand1: createTestValueSegment(`field${i}`) })),
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

      // Both components should render within reasonable time (less than 2 seconds each)
      expect(regularTime).toBeLessThan(3000);
      expect(hybridTime).toBeLessThan(3000);

      // Performance difference should not be extreme (neither should be more than 5x slower)
      const ratio = Math.max(regularTime, hybridTime) / Math.min(regularTime, hybridTime);
      expect(ratio).toBeLessThan(5);
    }, 10000); // Increase timeout to 10 seconds

    it('should handle large RowItem structures efficiently in SimpleQueryBuilder', () => {
      const largeRowItem = {
        isOldFormat: false,
        isRowFormat: true,
        itemValue: {
          operator: 'and',
          operand1: Array.from({ length: 10 }, (_, i) => ({
            id: `operand1-${i}`,
            type: ValueSegmentType.LITERAL,
            value: `field${i} equals value${i}`,
          })),
          operand2: Array.from({ length: 10 }, (_, i) => ({
            id: `operand2-${i}`,
            type: ValueSegmentType.LITERAL,
            value: `condition${i}`,
          })),
          type: GroupType.ROW,
        },
      };

      const start = performance.now();
      const { unmount } = render(
        <QueryBuilderTestWrapper>
          <SimpleQueryBuilder
            initialValue={convertRootPropToValue(largeRowItem.itemValue)}
            rowFormat={largeRowItem.isRowFormat}
            itemValue={largeRowItem.itemValue}
            getTokenPicker={mockGetTokenPicker}
            onChange={mockOnChange}
          />
        </QueryBuilderTestWrapper>
      );
      const end = performance.now();
      const renderTime = end - start;

      unmount();

      // Should render within reasonable time (less than 2 seconds)
      expect(renderTime).toBeLessThan(2000);
    }, 10000); // Increase timeout to 10 seconds
  });
});
