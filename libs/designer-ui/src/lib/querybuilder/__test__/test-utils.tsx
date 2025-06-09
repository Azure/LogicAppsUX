import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createLiteralValueSegment } from '../../editor/base/utils/helper';
import type { GroupItemProps, RowItemProps } from '../index';
import { GroupType } from '../index';
import { RowDropdownOptions } from '../RowDropdown';
import { GroupDropdownOptions } from '../GroupDropdown';
import type { ValueSegment } from '../../editor';
import type { GetTokenPickerHandler } from '../../editor/base';
import { vi } from 'vitest';

// Mock token picker handler
export const mockGetTokenPicker: GetTokenPickerHandler = vi.fn(() => ({
  tokenpicker: <div data-testid="mock-token-picker" />,
  onSetTokenPickerVisibility: vi.fn(),
}));

// Helper to create literal value segments
export const createTestValueSegment = (value: string): ValueSegment[] => [createLiteralValueSegment(value)];

// Test data factories
export const createTestRow = (overrides?: Partial<RowItemProps>): RowItemProps => ({
  type: GroupType.ROW,
  checked: false,
  operand1: createTestValueSegment('field1'),
  operator: RowDropdownOptions.EQUALS,
  operand2: createTestValueSegment('value1'),
  ...overrides,
});

export const createTestGroup = (overrides?: Partial<GroupItemProps>): GroupItemProps => ({
  type: GroupType.GROUP,
  checked: false,
  condition: GroupDropdownOptions.AND,
  items: [createTestRow()],
  ...overrides,
});

// Complex test scenarios
export const createComplexTestData = (): GroupItemProps => ({
  type: GroupType.GROUP,
  checked: false,
  condition: GroupDropdownOptions.AND,
  items: [
    createTestRow({ operand1: createTestValueSegment('field1') }),
    createTestGroup({
      condition: GroupDropdownOptions.OR,
      items: [createTestRow({ operand1: createTestValueSegment('field2') }), createTestRow({ operand1: createTestValueSegment('field3') })],
    }),
    createTestRow({ operand1: createTestValueSegment('field4') }),
    createTestGroup({
      condition: GroupDropdownOptions.AND,
      items: [
        createTestRow({ operand1: createTestValueSegment('field5') }),
        createTestGroup({
          condition: GroupDropdownOptions.OR,
          items: [createTestRow({ operand1: createTestValueSegment('field6') })],
        }),
      ],
    }),
  ],
});

// Helper to get move buttons - be more specific about which button to use
export const getMoveUpButton = async (buttonIndex = 0) => {
  const moreButtons = screen.getAllByRole('button', { name: /more commands/i });
  const moreButton = moreButtons[buttonIndex];
  await userEvent.click(moreButton);
  return screen.getByRole('menuitem', { name: /move up/i });
};

export const getMoveDownButton = async (buttonIndex = 0) => {
  const moreButtons = screen.getAllByRole('button', { name: /more commands/i });
  const moreButton = moreButtons[buttonIndex];
  await userEvent.click(moreButton);
  return screen.getByRole('menuitem', { name: /move down/i });
};

// Helper to check if move buttons are disabled
export const isMoveUpDisabled = async (buttonIndex = 0) => {
  const moreButtons = screen.getAllByRole('button', { name: /more commands/i });
  const moreButton = moreButtons[buttonIndex];
  await userEvent.click(moreButton);
  const moveUpButton = screen.getByRole('menuitem', { name: /move up/i });
  const isDisabled = moveUpButton.getAttribute('aria-disabled') === 'true';
  // Click somewhere else to close the menu
  await userEvent.click(document.body);
  return isDisabled;
};

export const isMoveDownDisabled = async (buttonIndex = 0) => {
  const moreButtons = screen.getAllByRole('button', { name: /more commands/i });
  const moreButton = moreButtons[buttonIndex];
  await userEvent.click(moreButton);
  const moveDownButton = screen.getByRole('menuitem', { name: /move down/i });
  const isDisabled = moveDownButton.getAttribute('aria-disabled') === 'true';
  // Click somewhere else to close the menu
  await userEvent.click(document.body);
  return isDisabled;
};

// Helper to check how many more commands buttons exist
export const getMoreCommandsButtonCount = () => {
  return screen.getAllByRole('button', { name: /more commands/i }).length;
};

// Mock handlers for testing
export const createMockHandlers = () => ({
  handleMove: vi.fn(),
  handleDeleteChild: vi.fn(),
  handleUpdateParent: vi.fn(),
  handleUngroupChild: vi.fn(),
});

// Test wrapper component
export const QueryBuilderTestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => <div>{children}</div>;
