import type { EditorConfig, NodeKey } from 'lexical';
import { TextNode } from 'lexical';

export class TokenNode extends TextNode {
  __className: string;
  constructor(className: string, text: string, key?: NodeKey) {
    super(text, key);
    this.__className = className;
  }
  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__className, node.__text, node.__key);
  }

  createDOM(config: EditorConfig) {
    const dom = super.createDOM(config);
    dom.className = this.__className;
    return dom;
  }

  isTextEntity() {
    return true;
  }
}

export function $isTokenTextNode(node: TextNode) {
  return node instanceof TokenNode;
}

export function $createTokenNode(className: string, text: string) {
  return new TokenNode(className, text).setMode('token');
}
