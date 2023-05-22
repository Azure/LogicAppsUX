import { processNodeType } from '../../../html/plugins/toolbar/helper/functions';
import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { $createTokenNode } from '../nodes/tokenNode';
import { defaultInitialConfig, htmlNodes } from './initialConfig';
import { createHeadlessEditor } from '@lexical/headless';
import { $generateNodesFromDOM } from '@lexical/html';
import type { LinkNode } from '@lexical/link';
import { $isLinkNode, $createLinkNode } from '@lexical/link';
import type { ListNode, ListItemNode } from '@lexical/list';
import { $isListNode, $isListItemNode, $createListItemNode } from '@lexical/list';
import type { HeadingNode } from '@lexical/rich-text';
import { $isHeadingNode } from '@lexical/rich-text';
import type { Expression } from '@microsoft/parsers-logic-apps';
import { ExpressionParser } from '@microsoft/parsers-logic-apps';
import type { LexicalNode, ParagraphNode, RootNode } from 'lexical';
import { $createParagraphNode, $isTextNode, $isLineBreakNode, $isParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const parseHtmlSegments = (value: ValueSegment[], tokensEnabled?: boolean): RootNode => {
  const editor = createHeadlessEditor({ ...defaultInitialConfig, nodes: htmlNodes });
  const parser = new DOMParser();
  const root = $getRoot();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode | HeadingNode | ListNode;

  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }
  const nodeMap = new Map<string, ValueSegment>();

  const stringValue = convertSegmentsToString(value, nodeMap);
  const dom = parser.parseFromString(stringValue, 'text/html');
  const nodes = $generateNodesFromDOM(editor, dom);
  nodes.forEach((currNode) => {
    if ($isParagraphNode(currNode) || $isListNode(currNode) || $isHeadingNode(currNode)) {
      if (paragraph.getChildren().length > 0) {
        root.append(paragraph);
      }
      paragraph = processNodeType(currNode);

      currNode.getChildren().forEach((childNode) => {
        // LinkNodes are a special case because they are within a paragraph node
        if ($isLinkNode(childNode)) {
          console.log('here');
          const linkNode = $createLinkNode(childNode.getURL());
          childNode.getChildren().forEach((listItemChildNode) => {
            appendChildrenNode(linkNode, listItemChildNode, nodeMap, tokensEnabled);
          });
          paragraph.append(linkNode);
        }
        // ListNodes have a special case where they have a ListItemNode as a child
        else if ($isListItemNode(childNode)) {
          const listItemNode = $createListItemNode();
          childNode.getChildren().forEach((listItemChildNode) => {
            appendChildrenNode(listItemNode, listItemChildNode, nodeMap, tokensEnabled);
          });
          paragraph.append(listItemNode);
        }
        // needs to wait for this fix https://github.com/facebook/lexical/issues/3879
        else if (!$isLineBreakNode(childNode)) {
          appendChildrenNode(paragraph, childNode, nodeMap, tokensEnabled);
        }
      });
    } else {
      paragraph.append(currNode);
    }
  });
  if (paragraph.getChildren().length > 0) {
    root.append(paragraph);
  }

  root.append(paragraph);

  return root;
};

// Appends the children Nodes while parsing for TokenNodes
const appendChildrenNode = (
  paragraph: ParagraphNode | HeadingNode | ListNode | ListItemNode | LinkNode,
  childNode: LexicalNode,
  nodeMap: Map<string, ValueSegment>,
  tokensEnabled?: boolean
) => {
  if ($isTextNode(childNode)) {
    const textContent = childNode.getTextContent();
    if (nodeMap.has(textContent)) {
      const tokenSegment = nodeMap.get(textContent);
      if (!tokenSegment || !tokenSegment.token) {
        paragraph.append(childNode);
      } else {
        const segmentValue = tokenSegment.value;
        const { brandColor, icon, title, name, value, tokenType } = tokenSegment.token;
        if (tokenType === TokenType.FX) {
          const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue);
          const token = $createTokenNode({
            title: getExpressionTokenTitle(expressionValue) ?? segmentValue ?? title,
            data: tokenSegment,
            brandColor,
            icon: icon,
            value: segmentValue,
          });
          tokensEnabled && paragraph.append(token);
        } else if (title || name) {
          const token = $createTokenNode({
            title: title ?? name,
            data: tokenSegment,
            brandColor,
            icon: icon,
            value: segmentValue ?? value,
          });
          tokensEnabled && paragraph.append(token);
        } else {
          throw new Error('Token Node is missing title or name');
        }
      }
    } else {
      paragraph.append(childNode);
    }
  } else {
    paragraph.append(childNode);
  }
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
          value: segmentValue,
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
