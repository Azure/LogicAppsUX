import { InputToken } from '../../../token/inputToken';
import type { updateTokenProps } from '../../../tokenpicker/plugins/UpdateTokenNode';
import type { ValueSegment } from '../../models/parameter';
import type { LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export interface TokenNodeProps {
  title: string;
  data: ValueSegment;
  icon?: string;
  brandColor?: string;
  value?: string;
  showTokenPickerSwitch?: (show?: boolean) => void;
}

export type SerailizedTokenNode = Spread<
  {
    title: string;
    data: ValueSegment;
    icon?: string;
    brandColor?: string;
    value?: string;
    type: 'token';
    version: 1;
  },
  SerializedLexicalNode
>;
export class TokenNode extends DecoratorNode<JSX.Element> {
  __title: string;
  __data: ValueSegment;
  __icon?: string;
  __brandColor?: string;
  __value?: string;
  __showTokenPickerSwitch?: (show?: boolean) => void;

  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__title, node.__data, node.__icon, node.__brandColor, node.__value, node.__showTokenPickerSwitch, node.__key);
  }

  static importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.title,
      serializedTokenNode.data,
      serializedTokenNode.icon,
      serializedTokenNode.brandColor,
      serializedTokenNode.value
    );
  }

  exportJSON(): SerailizedTokenNode {
    return {
      title: this.__title,
      data: this.__data,
      icon: this.__icon,
      value: this.__value,
      brandColor: this.__brandColor,
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

  constructor(
    title: string,
    data: ValueSegment,
    icon?: string,
    brandColor?: string,
    value?: string,
    showTokenPickerSwitch?: (show?: boolean) => void,
    key?: string
  ) {
    super(key);
    this.__brandColor = brandColor;
    this.__value = value;
    this.__data = data;
    this.__icon = icon;
    this.__title = title;
    this.__showTokenPickerSwitch = showTokenPickerSwitch;
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
        brandColor={this.__brandColor ?? 'black'}
        nodeKey={this.__key}
        isSecure={this.__data.token?.isSecure}
        showTokenPickerSwitch={this.__showTokenPickerSwitch}
      />
    );
  }
}

export function $createTokenNode({ icon, title, data, value, brandColor, showTokenPickerSwitch }: TokenNodeProps) {
  return new TokenNode(title, data, icon ? `url("${icon}")` : undefined, brandColor ?? 'black', value, showTokenPickerSwitch);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
