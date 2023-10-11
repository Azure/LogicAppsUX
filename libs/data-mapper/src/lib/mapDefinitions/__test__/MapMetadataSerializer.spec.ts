import type { ConnectionAndOrder } from '../../models';
import type { ConnectionDictionary } from '../../models/Connection';
import { convertConnectionShorthandToId, generateFunctionConnectionMetadata } from '../MapMetadataSerializer';

describe('mapMetadataSerializer', () => {
  describe('generateFunctionConnectionMetadata', () => {
    it('generates simple identifier', () => {
      const ans = generateFunctionConnectionMetadata('Average-AC', conn as any as ConnectionDictionary);

      expect(ans[0].inputOrder).toEqual(0);
      expect(ans[0].name).toEqual('target-/ns0:Root/DirectTranslation/Employee/ID');
    });

    it('generates multiple identifier', () => {
      const ans = generateFunctionConnectionMetadata('ToLower-25', conn as any as ConnectionDictionary);

      expect(ans[0].inputOrder).toEqual(0);
      expect(ans[0].name).toEqual('avg');
      expect(ans[1].inputOrder).toEqual(0);
      expect(ans[1].name).toEqual('target-/ns0:Root/DirectTranslation/Employee/ID');
    });
  });

  describe('convertConnectionShorthandToId', () => {
    it('converts simple ID', () => {
      const mock: ConnectionAndOrder[] = [
        { name: 'a', inputOrder: 0 },
        {
          name: 'b',
          inputOrder: 7,
        },
      ];
      const ans = convertConnectionShorthandToId(mock);
      expect(ans).toEqual('0-a,7-b,');
    });
  });
});

const conn = {
  'ToLower-25': {
    self: {
      node: {
        key: 'ToLower',
        functionName: 'lower-case',
      },
      reactFlowKey: 'ToLower-25',
    },
    outputs: [
      {
        node: {
          key: 'Average-AC',
        },
        reactFlowKey: 'Average-AC',
      },
    ],
  },
  'Average-AC': {
    self: {
      node: {
        key: 'Average',
        functionName: 'avg',
      },
      reactFlowKey: 'Average-AC',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'ToLower-25',
          node: {
            key: 'ToLower-25',
          },
        },
      ],
      '1': [],
    },
    outputs: [
      {
        node: {
          key: '/ns0:Root/DirectTranslation/Employee/ID',
        },
        reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/ID',
      },
    ],
  },
  'target-/ns0:Root/DirectTranslation/Employee/ID': {
    self: {
      node: {
        key: '/ns0:Root/DirectTranslation/Employee/ID',
      },
      reactFlowKey: 'target-/ns0:Root/DirectTranslation/Employee/ID',
    },
    inputs: {
      '0': [
        {
          reactFlowKey: 'Average-AC',
          node: {},
        },
      ],
      '1': [
        {
          reactFlowKey: 'Other-fn',
          node: {
            key: 'Average',
            functionName: 'avg',
          },
        },
      ],
    },
    outputs: [],
  },
};
