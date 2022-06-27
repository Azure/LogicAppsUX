import { InputToken } from '../../../token/inputToken';
import type { LexicalNode, SerializedElementNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';
import React from 'react';

export type SerailizedTokenNode = Spread<
  {
    icon: string;
    title: string;
    description?: string;
    brandColor?: string;
  },
  SerializedElementNode
>;
export class TokenNode extends DecoratorNode<JSX.Element> {
  __brandColor?: string;
  __description?: string;
  __icon: string;
  __title: string;

  static getType() {
    return 'inputToken';
  }

  static getTitle() {
    return 'title';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__description, node.__brandColor, node.__key);
  }

  constructor(icon: string, title: string, description?: string, brandColor?: string, key?: string) {
    super(key);
    this.__brandColor = brandColor;
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
    return <InputToken description={this.__description} icon={this.__icon} title={this.__title} brandColor={this.__brandColor} />;
  }
  static importJSON(serializedTokenNode: SerailizedTokenNode): any {
    return $createTokenNode(
      serializedTokenNode.icon,
      serializedTokenNode.title,
      serializedTokenNode.description,
      serializedTokenNode.brandColor
    );
  }
  exportJSON(): SerailizedTokenNode {
    return {
      ...super.exportJSON(),
      title: this.__title,
      icon: this.__icon,
      description: this.__description,
      brandColor: this.__brandColor,
      type: 'inputToken',
      children: [],
      direction: 'ltr',
      format: 'left',
      indent: 4,
    };
  }
}

export function $createTokenNode(icon: string, title: string, description?: string, brandColor?: string) {
  return new TokenNode(icon, title, description, brandColor);
}

export function $isTokenNode(node: LexicalNode) {
  return node instanceof TokenNode;
}
