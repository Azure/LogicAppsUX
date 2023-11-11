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
  description?: string;
}

export type SerailizedTokenNode = Spread<
  {
    title: string;
    data: ValueSegment;
    icon?: string;
    brandColor?: string;
    value?: string;
    description?: string;
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
  __description?: string;

  static override getType() {
    return 'token';
  }

  static override clone(node: TokenNode) {
    return new TokenNode(node.__title, node.__data, node.__icon, node.__brandColor, node.__value, node.__description, node.__key);
  }

  static override importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.title,
      serializedTokenNode.data,
      serializedTokenNode.icon,
      serializedTokenNode.brandColor,
      serializedTokenNode.value,
      serializedTokenNode.description
    );
  }

  override exportJSON(): SerailizedTokenNode {
    return {
      title: this.__title,
      data: this.__data,
      icon: this.__icon,
      value: this.__value,
      brandColor: this.__brandColor,
      description: this.__description,
      type: 'token',
      version: 1,
    };
  }

  // This is to enable copy to clipboard, even though there are some cases where @{} isn't needed, for the time being it's easier to always include it when copying
  override getTextContent(_includeInert?: boolean | undefined, _includeDirectionless?: false | undefined): string {
    return `@{${this.__data.value}}` ?? '';
  }

  override toString(): string {
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

  constructor(title: string, data: ValueSegment, icon?: string, brandColor?: string, value?: string, description?: string, key?: string) {
    super(key);
    this.__brandColor = brandColor;
    this.__value = value;
    this.__data = data;
    this.__icon = icon;
    this.__title = title;
    this.__description = description;
  }

  override createDOM() {
    const dom = document.createElement('span');
    dom.id = this.toString();
    return dom;
  }

  override updateDOM() {
    return false;
  }

  override decorate() {
    return (
      <InputToken
        value={this.__value}
        icon={this.__icon}
        title={this.__title}
        brandColor={this.__brandColor ?? 'black'}
        nodeKey={this.__key}
        isSecure={this.__data.token?.isSecure}
        description={this.__description}
      />
    );
  }
}

export function $createTokenNode({ icon, title, data, value, brandColor, description }: TokenNodeProps) {
  return new TokenNode(title, data, icon ? `url("${icon}")` : undefined, brandColor ?? 'black', value, description);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
