import { type ValueSegment, ValueSegmentType, GroupType, type GroupItems } from '@microsoft/designer-ui';
import { type AssertionDefintion, clone } from '@microsoft/logic-apps-shared';

/**
 * Loads token metadata for the given operand using the provided token mapping.
 * @param {ValueSegment[]} operand - The operand to load token metadata for.
 * @param {Record<string, ValueSegment>} tokenMapping - The mapping of tokens to their corresponding metadata.
 * @returns The operand with updated token metadata.
 */
const loadTokenMetaData = (operand: ValueSegment[], tokenMapping: Record<string, ValueSegment>) => {
  return operand.map((segment: ValueSegment) => {
    if (segment.type === ValueSegmentType.TOKEN && tokenMapping[segment.value]) {
      const newToken = { ...segment.token, ...tokenMapping[segment.value].token };
      return { ...segment, token: newToken };
    }
    return segment;
  }) as ValueSegment[];
};

/**
 * Recursively applies assertions to the items in a group.
 * @param {GroupItems} items - The group items to apply assertions to.
 * @param {Record<string, ValueSegment>} tokenMapping - The mapping of tokens to their corresponding values.
 * @returns The updated group items with assertions applied.
 */
const recurseAssertions = (items: GroupItems, tokenMapping: Record<string, ValueSegment>): GroupItems => {
  const newItems = clone(items);
  if (newItems.type === GroupType.GROUP) {
    newItems.items = newItems.items.map((item) => {
      return recurseAssertions(item, tokenMapping);
    });
    return newItems;
  } else {
    newItems.operand1 = loadTokenMetaData(newItems.operand1, tokenMapping);
    newItems.operand2 = loadTokenMetaData(newItems.operand2, tokenMapping);
    return newItems;
  }
};

/**
 * Updates the token metadata in the assertions object.
 * @param {Record<string, ValueSegment>} tokenMapping - The mapping of tokens to their corresponding value segments.
 * @param {Record<string, AssertionDefintion>} assertions - The assertions object to update.
 * @returns The updated assertions object.
 */
export const updateTokenMetadataInAssertions = (
  tokenMapping: Record<string, ValueSegment>,
  assertions: Record<string, AssertionDefintion>
) => {
  const updatedAssertions = clone(assertions);
  Object.keys(updatedAssertions).forEach((assertionKey) => {
    const { items } = updatedAssertions[assertionKey].expression;
    if (items) {
      updatedAssertions[assertionKey].expression.items = recurseAssertions(items, tokenMapping);
    }
  });

  return updatedAssertions;
};
