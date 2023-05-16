import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { $createTokenNode } from '../nodes/tokenNode';
import { defaultInitialConfig, htmlNodes } from './initialConfig';
import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM } from '@lexical/html';
import type { Expression } from '@microsoft/parsers-logic-apps';
import { ExpressionParser } from '@microsoft/parsers-logic-apps';
import type { ParagraphNode, RootNode } from 'lexical';
import { $isLineBreakNode, $isParagraphNode, $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const parseHtmlSegments = (value: ValueSegment[], tokensEnabled?: boolean): RootNode => {
  const editor = createHeadlessEditor({ ...defaultInitialConfig, nodes: htmlNodes });
  const parser = new DOMParser();
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
      const { brandColor, icon, title, name, value, tokenType } = segment.token;
      if (tokenType === TokenType.FX) {
        const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue);
        const token = $createTokenNode({
          title: getExpressionTokenTitle(expressionValue) ?? segmentValue ?? title,
          data: segment,
          brandColor,
          icon: icon,
          value: segmentValue ?? value,
        });
        tokensEnabled && paragraph.append(token);
      } else if (title || name) {
        const token = $createTokenNode({
          title: title ?? name,
          data: segment,
          brandColor,
          icon: icon,
          value: segmentValue ?? value,
        });
        tokensEnabled && paragraph.append(token);
      } else {
        throw new Error('Token Node is missing title or name');
      }
    } else {
      const dom = parser.parseFromString(segmentValue, 'text/html');
      const nodes = $generateNodesFromDOM(editor, dom);
      nodes.forEach((currNode) => {
        if ($isParagraphNode(currNode)) {
          if (paragraph.getChildren().length > 0) {
            root.append(paragraph);
          }
          paragraph = $createParagraphNode();
          // needs to wait for this fix https://github.com/facebook/lexical/issues/3879
          currNode.getChildren().forEach((childNode) => {
            if (!$isLineBreakNode(childNode)) {
              paragraph.append(childNode);
            }
          });
        } else {
          paragraph.append(currNode);
        }
      });
    }
  });
  if (paragraph.getChildren().length > 0) {
    root.append(paragraph);
  }

  return root;
};

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
      const { brandColor, icon, title, name, value, tokenType } = segment.token;
      if (tokenType === TokenType.FX) {
        const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue);
        const token = $createTokenNode({
          title: getExpressionTokenTitle(expressionValue) ?? segmentValue ?? title,
          data: segment,
          brandColor,
          icon: icon,
          value: segmentValue ?? value,
        });
        tokensEnabled && paragraph.append(token);
      } else if (title || name) {
        const token = $createTokenNode({
          title: title ?? name,
          data: segment,
          brandColor,
          icon: icon,
          value: segmentValue ?? value,
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

export const convertSegmentsToString = (input: ValueSegment[], nodeMap?: Map<string, ValueSegment>): string => {
  let text = '';
  input.forEach((segment) => {
    if (segment.type === ValueSegmentType.LITERAL) {
      text += segment.value;
    } else if (segment.token) {
      const { title, value, brandColor } = segment.token;
      const string = `$[${title},${value},${brandColor}]$`;
      text += string;
      nodeMap?.set(string, segment);
    }
  });
  return text;
};
