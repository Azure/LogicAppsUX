import type { GroupItemProps, GroupedItems, RowItemProps } from '.';
import { GroupType } from '.';
import type { ValueSegment } from '../editor';
import { isNumber, isBoolean } from '@microsoft/logic-apps-shared';

export const checkHeights = (item: GroupItemProps | RowItemProps, returnVal: number[], height: number): number[] => {
  if (item.checked) {
    returnVal.push(height);
  }
  if (item.type === GroupType.GROUP) {
    item.items.map((childItem) => checkHeights(childItem, returnVal, height + 1));
  }
  return returnVal;
};

export const getGroupedItems = (item: GroupItemProps | RowItemProps, returnVal: GroupedItems[], index: number): GroupedItems[] => {
  if (item.checked) {
    returnVal.push({ item: { ...item, checked: false }, index: index });
  }
  if (item.type === GroupType.GROUP) {
    item.items.map((childItem, index) => getGroupedItems(childItem, returnVal, index));
  }
  return returnVal;
};

export const operandNotEmpty = (valSeg: ValueSegment[]): boolean => {
  return valSeg.length > 0;
};

export const getOuterMostCommaIndex = (input: string): number => {
  let outermostCommaIndex = -1;
  let openParenthesesCount = 0;

  for (let i = 0; i < input.length; i++) {
    if (input[i] === '(') {
      openParenthesesCount++;
    } else if (input[i] === ')') {
      openParenthesesCount--;
    } else if (input[i] === ',' && openParenthesesCount === 0) {
      outermostCommaIndex = i;
      break;
    }
  }
  return outermostCommaIndex;
};

export const getOperationValue = (valSegment?: ValueSegment): ValueSegment | undefined => {
  if (!valSegment) {
    return undefined;
  }
  if (valSegment.token) {
    return valSegment;
  }
  const currValue = valSegment.value;
  const opeartionHasQuote = checkIfShouldHaveQuotes(valSegment);
  return { id: valSegment.id, type: valSegment.type, value: `${opeartionHasQuote ? "'" : ''}${currValue}${opeartionHasQuote ? "'" : ''}` };
};

const checkIfShouldHaveQuotes = (valSegment: ValueSegment): boolean => {
  const value = valSegment.value;
  if (value && (isNumber(value) || isBoolean(value))) {
    return false;
  }
  return true;
};
