import { InputToken } from '../../../token/inputToken';
import type { LexicalNode } from 'lexical';
import { DecoratorNode } from 'lexical';
import React from 'react';

export class TokenNode extends DecoratorNode<JSX.Element> {
  __description?: string;
  __icon: string;
  __title: string;

  static getType() {
    return 'inputToken';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__description, node.__key);
  }

  constructor(icon: string, title: string, description?: string, key?: string) {
    super(key);
    this.__description = description;
    this.__icon = icon;
    this.__title = title;
  }

  createDOM() {
    const dom = document.createElement('span');
    return dom;
  }

  updateDOM() {
    return false;
  }

  decorate() {
    return <InputToken description={this.__description} icon={this.__icon} title={this.__title} />;
  }
}

export function $createTokenNode(icon: string, title: string, description?: string) {
  return new TokenNode(icon, title, description);
}

export function $isTokenNode(node: LexicalNode) {
  return node instanceof TokenNode;
}
