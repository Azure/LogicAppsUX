import { type ValueSegment, ValueSegmentType, GroupType, type GroupItems } from '@microsoft/designer-ui';
import { type AssertionDefintion, clone } from '@microsoft/utils-logic-apps';

const loadTokenMetaData = (operand: ValueSegment[], tokenMapping: Record<string, ValueSegment>) => {
  return operand.map((segment: ValueSegment) => {
    if (segment.type === ValueSegmentType.TOKEN && tokenMapping[segment.value]) {
      const newToken = { ...segment.token, ...tokenMapping[segment.value].token };
      return { ...segment, token: newToken };
    }
    return segment;
  }) as ValueSegment[];
};

function recurseAssertions(items: GroupItems, tokenMapping: Record<string, ValueSegment>): GroupItems {
  const newItems = { ...items };
  if (newItems.type === GroupType.GROUP) {
    const test = newItems.items.map((item) => {
      return recurseAssertions(item, tokenMapping);
    });
    newItems.items = test;
    return newItems;
  } else {
    newItems.operand1 = loadTokenMetaData(newItems.operand1, tokenMapping);
    newItems.operand2 = loadTokenMetaData(newItems.operand2, tokenMapping);
    return newItems;
  }
}

export const updateTokenMetadataInAssertions = (
  tokenMapping: Record<string, ValueSegment>,
  assertions: Record<string, AssertionDefintion>
) => {
  const updatedAssertions = clone(assertions);
  Object.keys(updatedAssertions).forEach((assertionKey) => {
    const { items } = updatedAssertions[assertionKey].expression;
    if (items) {
      const test = recurseAssertions(items, tokenMapping);
      updatedAssertions[assertionKey].expression.items = test;
    }
  });

  return updatedAssertions;
};
