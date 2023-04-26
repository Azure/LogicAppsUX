import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { $createTokenNode } from '../nodes/tokenNode';
import type { Expression } from '@microsoft/parsers-logic-apps';
import { ExpressionParser } from '@microsoft/parsers-logic-apps';
import type { ParagraphNode, RootNode } from 'lexical';
import { $isParagraphNode, $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const parseSegments = (value: ValueSegment[], tokensEnabled?: boolean): RootNode => {
  const root = $getRoot();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode;

  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }

  value.forEach((segment) => {
    const segmentValue = segment.value;
    if (segment.type === ValueSegmentType.TOKEN && segment.token) {
      const { brandColor, icon, title, name, remappedValue, tokenType } = segment.token;
      if (tokenType === TokenType.FX) {
        const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue, /*isAliasPathParsingEnabled*/ false);
        const token = $createTokenNode({
          title: getExpressionTokenTitle(expressionValue) ?? segmentValue ?? title,
          data: segment,
          brandColor,
          icon: icon,
          value: segmentValue,
        });
        tokensEnabled && paragraph.append(token);
      } else if (title || name) {
        const token = $createTokenNode({
          title: title ?? name,
          data: segment,
          brandColor,
          icon: icon,
          value: remappedValue ?? segmentValue,
        });
        tokensEnabled && paragraph.append(token);
      } else {
        throw new Error('Token Node is missing title or name');
      }
    } else {
      const splitSegment = segmentValue.split('\n');
      paragraph.append($createTextNode(splitSegment[0]));
      for (let i = 1; i < splitSegment.length; i++) {
        root.append(paragraph);
        paragraph = $createParagraphNode();
        paragraph.append($createTextNode(splitSegment[i]));
      }
    }
  });
  root.append(paragraph);
  return root;
};
