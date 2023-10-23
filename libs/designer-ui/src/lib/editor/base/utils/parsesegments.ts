import { processNodeType } from '../../../html/plugins/toolbar/helper/functions';
import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { $createExtendedTextNode } from '../nodes/extendedTextNode';
import { $createTokenNode } from '../nodes/tokenNode';
import { defaultInitialConfig, htmlNodes } from './initialConfig';
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
import { $createParagraphNode, $isTextNode, $isLineBreakNode, $isParagraphNode, $createTextNode, $getRoot, createEditor } from 'lexical';

export const parseHtmlSegments = (value: ValueSegment[], tokensEnabled?: boolean): RootNode => {
  const editor = createEditor({ ...defaultInitialConfig, nodes: htmlNodes });
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
        // Non line break nodes are parsed and appended to the paragraph node
        else if (!$isLineBreakNode(childNode)) {
          appendChildrenNode(paragraph, childNode, nodeMap, tokensEnabled);
        }
        // // needs to wait for this fix https://github.com/facebook/lexical/issues/3879
        else if ($isLineBreakNode(childNode)) {
          paragraph.append($createTextNode('\n'));
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
  // if is a text node, parse for tokens
  if ($isTextNode(childNode)) {
    const textContent = childNode.getTextContent();
    const childNodeStyles = childNode.getStyle();
    const childNodeFormat = childNode.getFormat();
    // we need to pass in the styles and format of the parent node to the children node
    // because Lexical text nodes do not have styles or format
    // and we'll need to use the ExtendedTextNode to apply the styles and format
    appendStringSegment(paragraph, textContent, childNodeStyles, childNodeFormat, nodeMap, tokensEnabled);
  } else {
    paragraph.append(childNode);
  }
};

// Splits up text content into their respective nodes
export const appendStringSegment = (
  paragraph: ParagraphNode | HeadingNode | ListNode | ListItemNode | LinkNode,
  value: string,
  childNodeStyles?: string,
  childNodeFormat?: number,
  nodeMap?: Map<string, ValueSegment>,
  tokensEnabled?: boolean
) => {
  let currIndex = 0;
  let prevIndex = 0;
  while (currIndex < value.length) {
    if (value.substring(currIndex - 2, currIndex) === '$[') {
      const textSegment = value.substring(prevIndex, currIndex - 2);
      if (textSegment) {
        paragraph.append($createExtendedTextNode(textSegment, childNodeStyles, childNodeFormat));
      }
      const newIndex = value.indexOf(']$', currIndex) + 2;
      // token is found in the text
      if (nodeMap && tokensEnabled) {
        const tokenSegment = nodeMap.get(value.substring(currIndex - 2, newIndex));
        if (tokenSegment && tokenSegment.token) {
          const segmentValue = tokenSegment.value;
          const { brandColor, icon, title, name, value, tokenType } = tokenSegment.token;
          // Expression token handling
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
          }
          // other token handling
          else if (title || name) {
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
      }
      prevIndex = currIndex = newIndex;
    }
    currIndex++;
  }
  const textSegment = value.substring(prevIndex, currIndex);
  if (textSegment) {
    paragraph.append($createExtendedTextNode(textSegment, childNodeStyles, childNodeFormat));
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
      if (typeof segmentValue === 'string') {
        const splitSegment = segmentValue.split('\n');
        paragraph.append($createTextNode(splitSegment[0]));
        for (let i = 1; i < splitSegment.length; i++) {
          root.append(paragraph);
          paragraph = $createParagraphNode();
          paragraph.append($createTextNode(splitSegment[i]));
        }
      } else {
        paragraph.append($createTextNode(JSON.stringify(segmentValue)));
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
      const segmentValue = segment.value;
      // segment.token.value are not unique, so we'll need to use segment value instead
      const { title, brandColor } = segment.token;
      // get a unique identifier for the token
      const string = `$[${title},${segmentValue},${brandColor}]$`;
      text += string;
      nodeMap?.set(string, segment);
    }
  });
  return text;
};
