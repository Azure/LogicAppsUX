import { ExtendedTextNode } from '../nodes/extendedTextNode';
import { TokenNode } from '../nodes/tokenNode';
import EditorTheme from '../themes/editorTheme';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import { ListItemNode, ListNode } from '@lexical/list';
import { HeadingNode } from '@lexical/rich-text';
import { LineBreakNode, TextNode } from 'lexical';
import { PasswordNode } from '../nodes/passwordNode';

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
  ExtendedTextNode,
  LineBreakNode,
  { replace: TextNode, with: (node: TextNode) => new ExtendedTextNode(node.__text), withKlass: ExtendedTextNode },
];

export const defaultNodes = [AutoLinkNode, LinkNode, TokenNode, PasswordNode];
