import { InputToken } from '../../../token/inputToken';
import type { updateTokenProps } from '../../../tokenpicker/plugins/UpdateTokenNode';
import type { ValueSegment } from '../../models/parameter';
import type { LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export interface TokenNodeProps {
  brandColor?: string;
  value?: string;
  data: ValueSegment;
  icon: string;
  title: string;
}

export type SerailizedTokenNode = Spread<
  {
    icon: string;
    title: string;
    data: ValueSegment;
    value?: string;
    brandColor?: string;
    type: 'token';
    version: 1;
  },
  SerializedLexicalNode
>;
export class TokenNode extends DecoratorNode<JSX.Element> {
  __brandColor?: string;
  __value?: string;
  __icon: string;
  __title: string;
  __data: ValueSegment;

  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__data, node.__value, node.__brandColor, node.__key);
  }

  static importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.icon,
      serializedTokenNode.title,
      serializedTokenNode.data,
      serializedTokenNode.value,
      serializedTokenNode.brandColor
    );
  }

  exportJSON(): SerailizedTokenNode {
    return {
      title: this.__title,
      icon: this.__icon,
      value: this.__value,
      brandColor: this.__brandColor,
      data: this.__data,
      type: 'token',
      version: 1,
    };
  }

  toString(): string {
    return `$[${this.__title},${this.__value},${this.__brandColor}]$`;
  }

  convertToSegment(): ValueSegment {
    return this.__data;
  }

  updateContent(props: updateTokenProps, data: ValueSegment): void {
    const writable = this.getWritable();
    writable.__value = props.updatedValue;
    writable.__title = props.updatedTitle;
    writable.__data = data;
  }

  constructor(icon: string, title: string, data: ValueSegment, value?: string, brandColor?: string, key?: string) {
    super(key);
    this.__brandColor = brandColor;
    this.__value = value;
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
        value={this.__value}
        icon={this.__icon}
        title={this.__title}
        brandColor={this.__brandColor}
        nodeKey={this.__key}
        isSecure={this.__data.token?.isSecure}
      />
    );
  }
}

export function $createTokenNode({ icon, title, data, value, brandColor }: TokenNodeProps) {
  return new TokenNode(`url("${icon}")`, title, data, value, brandColor);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
