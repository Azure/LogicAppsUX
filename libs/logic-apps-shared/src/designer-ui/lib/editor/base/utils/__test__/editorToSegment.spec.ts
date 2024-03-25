import { ValueSegmentType } from '../../../models/parameter';
import { convertStringToSegments } from '../editorToSegment';
import type { ValueSegment } from '@microsoft/logic-apps-shared';

type SimplifiedValueSegment = Omit<ValueSegment, 'id'>;

describe('lib/editor/base/utils/editorToSegment', () => {
  describe('convertStringToSegments', () => {
    const getInitializeVariableAbcToken = (): SimplifiedValueSegment => ({
      type: 'token',
      token: {
        key: 'variables:abc',
        name: 'abc',
        type: 'string',
        title: 'abc',
        brandColor: '#770BD6',
        icon: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzJweCIgaGVpZ2h0PSIzMnB4IiBlbmFibGUtYmFja2dyb3VuZD0ibmV3IDAgMCAzMiAzMiIgdmVyc2lvbj0iMS4xIiB2aWV3Qm94PSIwIDAgMzIgMzIiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+DQogPHJlY3Qgd2lkdGg9IjMyIiBoZWlnaHQ9IjMyIiBmaWxsPSIjNzcwQkQ2Ii8+DQogPGcgZmlsbD0iI2ZmZiI+DQogIDxwYXRoIGQ9Ik02Ljc2MywxMy42ODV2LTMuMjA4QzYuNzYzLDguNzQ4LDcuNzYyLDgsMTAsOHYxLjA3Yy0xLDAtMiwwLjMyNS0yLDEuNDA3djMuMTg4ICAgIEM4LDE0LjgzNiw2LjUxMiwxNiw1LjUxMiwxNkM2LjUxMiwxNiw4LDE3LjE2NCw4LDE4LjMzNVYyMS41YzAsMS4wODIsMSwxLjQyOSwyLDEuNDI5VjI0Yy0yLjIzOCwwLTMuMjM4LTAuNzcyLTMuMjM4LTIuNXYtMy4xNjUgICAgYzAtMS4xNDktMC44OTMtMS41MjktMS43NjMtMS41ODV2LTEuNUM1Ljg3LDE1LjE5NCw2Ljc2MywxNC44MzQsNi43NjMsMTMuNjg1eiIvPg0KICA8cGF0aCBkPSJtMjUuMjM4IDEzLjY4NXYtMy4yMDhjMC0xLjcyOS0xLTIuNDc3LTMuMjM4LTIuNDc3djEuMDdjMSAwIDIgMC4zMjUgMiAxLjQwN3YzLjE4OGMwIDEuMTcxIDEuNDg4IDIuMzM1IDIuNDg4IDIuMzM1LTEgMC0yLjQ4OCAxLjE2NC0yLjQ4OCAyLjMzNXYzLjE2NWMwIDEuMDgyLTEgMS40MjktMiAxLjQyOXYxLjA3MWMyLjIzOCAwIDMuMjM4LTAuNzcyIDMuMjM4LTIuNXYtMy4xNjVjMC0xLjE0OSAwLjg5My0xLjUyOSAxLjc2Mi0xLjU4NXYtMS41Yy0wLjg3LTAuMDU2LTEuNzYyLTAuNDE2LTEuNzYyLTEuNTY1eiIvPg0KICA8cGF0aCBkPSJtMTUuODE1IDE2LjUxMmwtMC4yNDItMC42NDFjLTAuMTc3LTAuNDUzLTAuMjczLTAuNjk4LTAuMjg5LTAuNzM0bC0wLjM3NS0wLjgzNmMtMC4yNjYtMC41OTktMC41MjEtMC44OTgtMC43NjYtMC44OTgtMC4zNyAwLTAuNjYyIDAuMzQ3LTAuODc1IDEuMDM5LTAuMTU2LTAuMDU3LTAuMjM0LTAuMTQxLTAuMjM0LTAuMjUgMC0wLjMyMyAwLjE4OC0wLjY5MiAwLjU2Mi0xLjEwOSAwLjM3NS0wLjQxNyAwLjcxLTAuNjI1IDEuMDA3LTAuNjI1IDAuNTgzIDAgMS4xODYgMC44MzkgMS44MTEgMi41MTZsMC4xNjEgMC40MTQgMC4xOC0wLjI4OWMxLjEwOC0xLjc2IDIuMDQ0LTIuNjQxIDIuODA0LTIuNjQxIDAuMTk4IDAgMC40MyAwLjA1OCAwLjY5NSAwLjE3MmwtMC45NDYgMC45OTJjLTAuMTI1LTAuMDM2LTAuMjE0LTAuMDU1LTAuMjY2LTAuMDU1LTAuNTczIDAtMS4yNTYgMC42NTktMi4wNDggMS45NzdsLTAuMjI3IDAuMzc5IDAuMTc5IDAuNDhjMC42ODQgMS44OTEgMS4yNDkgMi44MzYgMS42OTQgMi44MzYgMC40MDggMCAwLjcyLTAuMjkyIDAuOTM1LTAuODc1IDAuMTQ2IDAuMDk0IDAuMjE5IDAuMTkgMC4yMTkgMC4yODkgMCAwLjI2MS0wLjIwOCAwLjU3My0wLjYyNSAwLjkzOHMtMC43NzYgMC41NDctMS4wNzggMC41NDdjLTAuNjA0IDAtMS4yMjEtMC44NTItMS44NTEtMi41NTVsLTAuMjE5LTAuNTc4LTAuMjI3IDAuMzk4Yy0xLjA2MiAxLjgyMy0yLjA3OCAyLjczNC0zLjA0NyAyLjczNC0wLjM2NSAwLTAuNjc1LTAuMDkxLTAuOTMtMC4yNzFsMC45MDYtMC44ODVjMC4xNTYgMC4xNTYgMC4zMzggMC4yMzQgMC41NDcgMC4yMzQgMC41ODggMCAxLjI1LTAuNTk2IDEuOTg0LTEuNzg2bDAuNDA2LTAuNjU4IDAuMTU1LTAuMjU5eiIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgNS40OTI1IDMyLjI0NSkiIGN4PSIxOS43NTciIGN5PSIxMy4yMjUiIHJ4PSIuNzc4IiByeT0iLjc3OCIvPg0KICA8ZWxsaXBzZSB0cmFuc2Zvcm09Im1hdHJpeCguMDUzNiAtLjk5ODYgLjk5ODYgLjA1MzYgLTcuNTgzOSAzMC42MjkpIiBjeD0iMTIuMzY2IiBjeT0iMTkuMzE1IiByeD0iLjc3OCIgcnk9Ii43NzgiLz4NCiA8L2c+DQo8L3N2Zz4NCg==',
        tokenType: 'variable',
        value: "variables('abc')",
      },
      value: "variables('abc')",
    });
    const getInitializeVariableOpenBraceToken = (): SimplifiedValueSegment => ({
      ...getInitializeVariableAbcToken(),
      token: {
        ...getInitializeVariableAbcToken().token,
        key: 'variables:@{',
        value: "variables('@{')",
      },
      value: "variables('@{')",
    });
    const getCreateNewFolderToken = (): SimplifiedValueSegment => ({
      type: 'token',
      token: {
        key: 'body.$.{Link}',
        name: '{Link}',
        type: 'string',
        title: 'Link to item',
        brandColor: '#036C70',
        icon: 'https://connectoricons-prod.azureedge.net/releases/v1.0.1676/1.0.1676.3617/sharepointonline/icon.png',
        description:
          'Link that can be used to get to the file or list item. Only people with permissions to the item will be able to open the link.',
        tokenType: 'outputs',
        actionName: 'Create_new_folder',
        required: false,
        isSecure: false,
        source: 'body',
        schema: {
          title: 'Link to item',
          description:
            'Link that can be used to get to the file or list item. Only people with permissions to the item will be able to open the link.',
          type: 'string',
          'x-ms-permission': 'read-only',
          'x-ms-sort': 'none',
        },
        value: "body('Create_new_folder')?['{Link}']",
      },
      value: "body('Create_new_folder')?['{Link}']",
    });

    it('does not parse segments into tokens if tokensEnabled is not set', () => {
      const nodeMap = new Map<string, ValueSegment>();
      nodeMap.set(`@{variables('abc')}`, { id: '', ...getInitializeVariableAbcToken() });
      nodeMap.set(`@{body('Create_new_folder')?['{Link}']}`, { id: '', ...getCreateNewFolderToken() });

      const input = `Text before @{variables('abc')} text after`;

      const segments = convertStringToSegments(input, nodeMap);
      const simplifiedSegments = segments.map(
        (segment): SimplifiedValueSegment => ({
          // Remove IDs for easier comparison.
          token: segment.token,
          type: segment.type,
          value: segment.value,
        })
      );

      expect(simplifiedSegments).toEqual([{ type: ValueSegmentType.LITERAL, value: input }]);
    });

    it.each<[string, SimplifiedValueSegment[]]>([
      ['plain text', [{ type: ValueSegmentType.LITERAL, value: 'plain text' }]],
      ['@{no closing brace', [{ type: ValueSegmentType.LITERAL, value: '@{no closing brace' }]],
      [`Text before @{variables('abc')}`, [{ type: ValueSegmentType.LITERAL, value: 'Text before ' }, getInitializeVariableAbcToken()]],
      [
        `Text before @{variables('abc')} text after`,
        [
          { type: ValueSegmentType.LITERAL, value: 'Text before ' },
          getInitializeVariableAbcToken(),
          { type: ValueSegmentType.LITERAL, value: ' text after' },
        ],
      ],
      [
        `Text quoted '@{variables('abc')}'`,
        [
          { type: ValueSegmentType.LITERAL, value: `Text quoted '` },
          getInitializeVariableAbcToken(),
          { type: ValueSegmentType.LITERAL, value: `'` },
        ],
      ],
      [
        `Text before @{body('Create_new_folder')?['{Link}']} text after`,
        [
          { type: ValueSegmentType.LITERAL, value: 'Text before ' },
          getCreateNewFolderToken(),
          { type: ValueSegmentType.LITERAL, value: ' text after' },
        ],
      ],
      [
        `t1 @{variables('@{')} t2`,
        [
          { type: ValueSegmentType.LITERAL, value: 't1 ' },
          getInitializeVariableOpenBraceToken(),
          { type: ValueSegmentType.LITERAL, value: ' t2' },
        ],
      ],
      [`t1 @{variables('@{')`, [{ type: ValueSegmentType.LITERAL, value: `t1 @{variables('@{')` }]],
      [
        `t1 @{not a token t2 @{variables('abc')} t3`,
        [
          { type: ValueSegmentType.LITERAL, value: 't1 @{not a token t2 ' },
          getInitializeVariableAbcToken(),
          { type: ValueSegmentType.LITERAL, value: ' t3' },
        ],
      ],
      [
        `t1 @{not a token} t2 @{variables('abc')} t3`,
        [
          { type: ValueSegmentType.LITERAL, value: 't1 @{not a token} t2 ' },
          getInitializeVariableAbcToken(),
          { type: ValueSegmentType.LITERAL, value: ' t3' },
        ],
      ],
    ])('parses segments out of %p with appropriate node map', (input, expectedTokens) => {
      const nodeMap = new Map<string, ValueSegment>();
      nodeMap.set(`@{variables('abc')}`, { id: '', ...getInitializeVariableAbcToken() });
      nodeMap.set(`@{variables('@{')}`, { id: '', ...getInitializeVariableOpenBraceToken() });
      nodeMap.set(`@{body('Create_new_folder')?['{Link}']}`, { id: '', ...getCreateNewFolderToken() });

      const segments = convertStringToSegments(input, nodeMap, { tokensEnabled: true });
      const simplifiedSegments = segments.map(
        (segment): SimplifiedValueSegment => ({
          // Remove IDs for easier comparison.
          token: segment.token,
          type: segment.type,
          value: segment.value,
        })
      );

      expect(simplifiedSegments).toEqual(expectedTokens);
    });

    it.each<[string, SimplifiedValueSegment[]]>([
      ['plain text', [{ type: ValueSegmentType.LITERAL, value: 'plain text' }]],
      [
        `Text before @{variables('abc')} text after`,
        [{ type: ValueSegmentType.LITERAL, value: `Text before @{variables('abc')} text after` }],
      ],
      [
        `Text before @{body('Create_new_folder')?['{Link}']} text after`,
        [{ type: ValueSegmentType.LITERAL, value: `Text before @{body('Create_new_folder')?['{Link}']} text after` }],
      ],
    ])('parses segments out of %p with an empty node map', (input, expectedTokens) => {
      const nodeMap = new Map<string, ValueSegment>();

      const segments = convertStringToSegments(input, nodeMap, { tokensEnabled: true });
      const simplifiedSegments = segments.map(
        (segment): SimplifiedValueSegment => ({
          // Remove IDs for easier comparison.
          token: segment.token,
          type: segment.type,
          value: segment.value,
        })
      );

      expect(simplifiedSegments).toEqual(expectedTokens);
    });
  });
});
