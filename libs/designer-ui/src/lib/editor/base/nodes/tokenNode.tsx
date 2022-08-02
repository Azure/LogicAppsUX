import { InputToken } from '../../../token/inputToken';
import type { ValueSegment } from '../../models/parameter';
import { TokenType, ValueSegmentType } from '../../models/parameter';
import { guid } from '@microsoft-logic-apps/utils';
import type { LexicalNode, SerializedLexicalNode, Spread } from 'lexical';
import { DecoratorNode } from 'lexical';

export interface TokenNodeProps {
  brandColor?: string;
  description?: string;
  data?: any;
  icon: string;
  title: string;
}

export type SerailizedTokenNode = Spread<
  {
    icon: string;
    title: string;
    description?: string;
    brandColor?: string;
    data?: any;
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
  __data?: any;

  static getType() {
    return 'token';
  }

  static clone(node: TokenNode) {
    return new TokenNode(node.__icon, node.__title, node.__description, node.__brandColor, node.__data, node.__key);
  }

  static importJSON(serializedTokenNode: SerailizedTokenNode): TokenNode {
    return new TokenNode(
      serializedTokenNode.icon,
      serializedTokenNode.title,
      serializedTokenNode.description,
      serializedTokenNode.brandColor,
      serializedTokenNode.data
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
    return {
      id: guid(),
      type: ValueSegmentType.TOKEN,
      token: {
        tokenType: TokenType.OUTPUTS,
        key: this.__key,
        brandColor: this.__brandColor,
        icon: this.__icon,
        description: this.__description,
        title: this.__title,
        actionName: this.__data?.actionName,
        arrayDetails: this.__data?.arrayDetails,
        expression: this.__data?.expression,
        format: this.__data?.format,
        isSecure: this.__data?.isSecure,
        name: this.__data?.name,
        required: this.__data?.required,
        source: this.__data?.source,
        type: this.__data?.type,
      },
      value: this.__title,
    };
  }

  constructor(icon: string, title: string, description?: string, brandColor?: string, data?: any, key?: string) {
    super(key);
    this.__brandColor = brandColor;
    this.__description = description;
    this.__icon = icon;
    this.__title = title;
    this.__data = data;
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

export function $createTokenNode({ icon, title, description, brandColor, data }: TokenNodeProps) {
  return new TokenNode(icon, title, description, brandColor, data);
}

export function $isTokenNode(node: LexicalNode | null): node is TokenNode {
  return node instanceof TokenNode;
}
