import { InputToken } from '../../../token/inputToken';
import type { updateTokenProps } from '../../../tokenpicker/plugins/UpdateTokenNode';
import type { ValueSegment } from '../../models/parameter';
import type { LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export interface TokenNodeProps {
  brandColor?: string;
  description?: string;
  data: ValueSegment;
  icon: string;
  title: string;
}

export type SerailizedTokenNode = Spread<
  {
    icon: string;
    title: string;
    data: ValueSegment;
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
  __data: ValueSegment;

  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__data, node.__description, node.__brandColor, node.__key);
  }

  static importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.icon,
      serializedTokenNode.title,
      serializedTokenNode.data,
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
      data: this.__data,
      type: 'token',
      version: 1,
    };
  }

  toString(): string {
    return `$[${this.__title},${this.__description},${this.__brandColor}]$`;
  }

  convertToSegment(): ValueSegment {
    return this.__data;
  }

  updateContent(props: updateTokenProps, data: ValueSegment): void {
    const writable = this.getWritable();
    writable.__description = props.updatedDescription;
    writable.__title = props.updatedTitle;
    writable.__data = data;
  }

  constructor(icon: string, title: string, data: ValueSegment, description?: string, brandColor?: string, key?: string) {
    super(key);
    this.__brandColor = brandColor;
    this.__description = description;
    this.__data = data;
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

export function $createTokenNode({ icon, title, data, description, brandColor }: TokenNodeProps) {
  return new TokenNode(`url("${icon}")`, title, data, description, brandColor);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
