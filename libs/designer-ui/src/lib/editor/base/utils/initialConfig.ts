import { ExtentedTextNode } from '../nodes/extendedTextNode';
import { TokenNode } from '../nodes/tokenNode';
import EditorTheme from '../themes/editorTheme';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode } from '@lexical/rich-text';
import { TextNode } from 'lexical';

const onError = (error: Error) => {
  console.error(error);
};

export const defaultInitialConfig = {
  theme: EditorTheme,
  onError,
  namespace: 'editor',
};

export const htmlNodes = [
  AutoLinkNode,
  LinkNode,
  TokenNode,
  ListNode,
  ListItemNode,
  HeadingNode,
  ExtentedTextNode,
  { replace: TextNode, with: (node: TextNode) => new ExtentedTextNode(node.__text, node.__key) },
];

export const defaultNodes = [AutoLinkNode, LinkNode, TokenNode];
