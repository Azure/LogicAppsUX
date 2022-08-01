import type { Segment } from '..';
import { InputToken } from '../../../token/inputToken';
import { ValueSegmentType } from '../../models/parameter';
import type { LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export interface TokenNodeProps {
  brandColor?: string;
  description?: string;
  icon: string;
  title: string;
}

export type SerailizedTokenNode = Spread<
  {
    icon: string;
    title: string;
    description?: string;
    brandColor?: string;
    type: 'token';
    version: 1;
  },
  SerializedLexicalNode
>;
export class TokenNode extends DecoratorNode<JSX.Element> {
  __brandColor?: string;
  __description?: string;
  __icon: string;
  __title: string;

  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__description, node.__brandColor, node.__key);
  }

  static importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.icon,
      serializedTokenNode.title,
      serializedTokenNode.description,
      serializedTokenNode.brandColor
    );
  }

  exportJSON(): SerailizedTokenNode {
    return {
      title: this.__title,
      icon: this.__icon,
      description: this.__description,
      brandColor: this.__brandColor,
      type: 'token',
      version: 1,
    };
  }

  toString(): string {
    return `$[${this.__title},${this.__description},${this.__brandColor}]$`;
  }

  convertToSegment(): Segment {
    return {
      type: ValueSegmentType.TOKEN,
      token: {
        nodeKey: this.__key,
        brandColor: this.__brandColor,
        icon: this.__icon,
        description: this.__description,
        title: this.__title,
      },
    };
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
    return (
      <InputToken
        description={this.__description}
        icon={this.__icon}
        title={this.__title}
        brandColor={this.__brandColor}
        nodeKey={this.__key}
      />
    );
  }
}

export function $createTokenNode({ icon, title, description, brandColor }: TokenNodeProps) {
  return new TokenNode(icon, title, description, brandColor);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
