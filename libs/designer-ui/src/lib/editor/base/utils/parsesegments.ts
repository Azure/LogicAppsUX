import { processNodeType } from '../../../html/plugins/toolbar/helper/functions';
import {
  decodeSegmentValueInDomContext,
  decodeSegmentValueInLexicalContext,
  encodeSegmentValueInDomContext,
  encodeSegmentValueInLexicalContext,
} from '../../../html/plugins/toolbar/helper/util';
import { getExpressionTokenTitle } from '../../../tokenpicker/util';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { $createExtendedTextNode } from '../nodes/extendedTextNode';
import type { TokenNode } from '../nodes/tokenNode';
import { $createTokenNode } from '../nodes/tokenNode';
import { convertStringToSegments } from './editorToSegment';
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

export interface SegmentParserOptions {
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  readonly?: boolean;
  tokensEnabled?: boolean;
}

export const parseHtmlSegments = (value: ValueSegment[], options?: SegmentParserOptions): RootNode => {
  const { loadParameterValueFromString, readonly, tokensEnabled } = options ?? {};
  const editor = createEditor({ ...defaultInitialConfig, nodes: htmlNodes });
  const parser = new DOMParser();
  const root = $getRoot().clear();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode | HeadingNode | ListNode;

  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }
  const nodeMap = new Map<string, ValueSegment>();

  const stringValue = convertSegmentsToString(value, nodeMap);
  const encodedStringValue = encodeStringSegmentTokensInLexicalContext(stringValue, nodeMap);

  const dom = parser.parseFromString(encodedStringValue, 'text/html');
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
          const linkNode = $createLinkNode(getURL(childNode, tokensEnabled, nodeMap));
          childNode.getChildren().forEach((listItemChildNode) => {
            appendChildrenNode(linkNode, listItemChildNode, nodeMap, tokensEnabled, readonly, loadParameterValueFromString);
          });
          paragraph.append(linkNode);
        }
        // ListNodes have a special case where they have a ListItemNode as a child
        else if ($isListItemNode(childNode)) {
          const listItemNode = $createListItemNode();
          childNode.getChildren().forEach((listItemChildNode) => {
            appendChildrenNode(listItemNode, listItemChildNode, nodeMap, tokensEnabled, readonly, loadParameterValueFromString);
          });
          paragraph.append(listItemNode);
        }
        // Non line break nodes are parsed and appended to the paragraph node
        else if (!$isLineBreakNode(childNode)) {
          appendChildrenNode(paragraph, childNode, nodeMap, tokensEnabled, readonly, loadParameterValueFromString);
        }
        // needs to wait for this fix https://github.com/facebook/lexical/issues/3879
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

const getURL = (node: LinkNode, tokensEnabled?: boolean, nodeMap?: Map<string, ValueSegment>): string => {
  const valueUrl = node.getURL();
  const urlSegments = convertStringToSegments(valueUrl, tokensEnabled, nodeMap);
  return urlSegments
    .map((segment) => (segment.type === ValueSegmentType.LITERAL ? segment.value : `@{${segment.value}}`))
    .reduce((accumulator, current) => accumulator + current);
};

// Appends the children Nodes while parsing for TokenNodes
const appendChildrenNode = (
  paragraph: ParagraphNode | HeadingNode | ListNode | ListItemNode | LinkNode,
  childNode: LexicalNode,
  nodeMap: Map<string, ValueSegment>,
  tokensEnabled?: boolean,
  readonly?: boolean,
  loadParameterValueFromString?: (value: string) => ValueSegment[]
) => {
  // if is a text node, parse for tokens
  if ($isTextNode(childNode)) {
    const textContent = childNode.getTextContent();
    const decodedTextContent = tokensEnabled ? decodeSegmentValueInLexicalContext(textContent) : textContent;

    // we need to pass in the styles and format of the parent node to the children node
    // because Lexical text nodes do not have styles or format
    // and we'll need to use the ExtendedTextNode to apply the styles and format
    const childNodeStyles = childNode.getStyle();
    const childNodeFormat = childNode.getFormat();

    if (tokensEnabled && nodeMap) {
      const contentAsParameter = loadParameterValueFromString?.(decodedTextContent);
      if (contentAsParameter) {
        contentAsParameter.forEach((segment) => {
          const tokenNode = createTokenNodeFromSegment(segment, readonly);
          if (tokenNode) {
            paragraph.append(tokenNode);
          } else {
            appendStringSegment(paragraph, decodedTextContent, childNodeStyles, childNodeFormat, nodeMap, tokensEnabled, readonly);
          }
        });

        return;
      }
    }

    appendStringSegment(paragraph, decodedTextContent, childNodeStyles, childNodeFormat, nodeMap, tokensEnabled, readonly);
  }

  paragraph.append(childNode);
};

// Splits up text content into their respective nodes
export const appendStringSegment = (
  paragraph: ParagraphNode | HeadingNode | ListNode | ListItemNode | LinkNode,
  value: string,
  childNodeStyles?: string,
  childNodeFormat?: number,
  nodeMap?: Map<string, ValueSegment>,
  tokensEnabled?: boolean,
  readonly?: boolean
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
        const token = createTokenNodeFromSegment(tokenSegment, readonly);
        token && paragraph.append(token);
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

export const parseSegments = (valueSegments: ValueSegment[], options?: SegmentParserOptions): RootNode => {
  const { readonly, tokensEnabled } = options ?? {};
  const root = $getRoot();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode;

  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }

  // iterate through the segments and create the appropriate node
  valueSegments.forEach((segment) => {
    const segmentValue = segment.value;
    if (segment.type === ValueSegmentType.TOKEN && segment.token) {
      const { brandColor, icon, title, name, value, tokenType } = segment.token;
      if (tokenType === TokenType.FX) {
        const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue);
        const token = $createTokenNode({
          title: getExpressionTokenTitle(expressionValue) ?? title,
          data: segment,
          brandColor,
          icon,
          value,
          readonly,
        });
        tokensEnabled && paragraph.append(token);
      } else if (title || name) {
        const token = $createTokenNode({
          title: title ?? name,
          data: segment,
          brandColor,
          icon,
          value,
          readonly,
        });
        tokensEnabled && paragraph.append(token);
      } else {
        throw new Error('Token Node is missing title or name');
      }
    } else {
      // there are some cases where segmentValue comes in as a JSON
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
      const { value } = segment.token;
      // get a text-identifiable unique id for the token
      const string = `@{${value}}`;
      text += string;
      nodeMap?.set(string, segment);
    }
  });
  return text;
};

const createTokenNodeFromSegment = (tokenSegment: ValueSegment | undefined, readonly: boolean | undefined): TokenNode | undefined => {
  if (!tokenSegment?.token) {
    return undefined;
  }

  const segmentValue = tokenSegment.value;
  const { brandColor, icon, title, name, value, tokenType } = tokenSegment.token;
  // Expression token handling
  if (tokenType === TokenType.FX) {
    const expressionValue: Expression = ExpressionParser.parseExpression(segmentValue);
    const token = $createTokenNode({
      title: getExpressionTokenTitle(expressionValue) ?? title,
      data: tokenSegment,
      brandColor,
      icon,
      value,
      readonly,
    });
    return token;
  }

  // other token handling
  if (title || name) {
    const token = $createTokenNode({
      title: title ?? name,
      data: tokenSegment,
      brandColor,
      icon,
      value,
      readonly,
    });
    return token;
  }

  throw new Error('Token Node is missing title or name');
};

export const decodeStringSegmentTokensInDomContext = (value: string, nodeMap: Map<string, ValueSegment>): string =>
  encodeOrDecodeStringSegmentTokens(value, nodeMap, decodeSegmentValueInDomContext);

export const encodeStringSegmentTokensInDomContext = (value: string, nodeMap: Map<string, ValueSegment>): string =>
  encodeOrDecodeStringSegmentTokens(value, nodeMap, encodeSegmentValueInDomContext);

export const decodeStringSegmentTokensInLexicalContext = (value: string, nodeMap: Map<string, ValueSegment>): string =>
  encodeOrDecodeStringSegmentTokens(value, nodeMap, decodeSegmentValueInLexicalContext);

export const encodeStringSegmentTokensInLexicalContext = (value: string, nodeMap: Map<string, ValueSegment>): string =>
  encodeOrDecodeStringSegmentTokens(value, nodeMap, encodeSegmentValueInLexicalContext);

const encodeOrDecodeStringSegmentTokens = (
  value: string,
  nodeMap: Map<string, ValueSegment>,
  transformer: (_: string) => string
): string => {
  let newValue = value;

  for (const [key] of nodeMap.entries()) {
    const encodedKey = transformer(key);
    newValue = newValue.replaceAll(key, encodedKey);
  }

  return newValue;
};
