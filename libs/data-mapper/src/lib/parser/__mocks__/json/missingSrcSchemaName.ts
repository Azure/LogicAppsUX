import type { JsonInputStyle } from '../../jsonToMapcodeParser';

export const missingSrcSchemaJsonMock: JsonInputStyle = {
  dstSchemaName: 'CustomerOrders.xsd',
  mappings: {
    targetNodeKey: '/ns0:CustomerOrders',
    targetValue: {
      value: '/ns0:Orders/@Item',
    },
  },
};
