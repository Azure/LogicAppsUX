import type { SerializedTextNode, Spread } from 'lexical';
import { TextNode } from 'lexical';

export type SerializedPasswordNode = Spread<
  {
    type: 'password';
  },
  SerializedTextNode
>;

export class PasswordNode extends TextNode {
  private __realText: string;

  constructor(text: string, key?: string) {
    super('•'.repeat(text.length), key);
    this.__realText = text;
  }

  static getType(): string {
    return 'password';
  }

  static clone(node: PasswordNode): PasswordNode {
    return new PasswordNode(node.__realText, node.__key);
  }

  getTextContent(): string {
    return this.__text; // Ensure real password is returned when needed
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'password-mask';
    span.textContent = '•'.repeat(this.__text.length);
    return span;
  }

  updateDOM(prevNode: PasswordNode, dom: HTMLElement): boolean {
    if (this.__text !== prevNode.__text) {
      dom.textContent = '•'.repeat(this.__text.length);
    }
    return false;
  }

  exportJSON(): SerializedPasswordNode {
    return {
      format: this.__format,
      detail: this.__detail,
      style: this.__style,
      mode: 'normal',
      type: 'password',
      text: this.__text, // Serialize the real password
      version: 1,
    };
  }

  spliceText(offset: number, delCount: number, newText: string, moveSelection?: boolean): TextNode {
    if (!newText) {
      const updatedText = this.__realText.substring(0, offset) + this.__realText.substring(offset + delCount);
      this.setPassword(updatedText);
    }
    return super.spliceText(offset, delCount, newText, moveSelection);
  }

  static importJSON(serializedNode: any): PasswordNode {
    return new PasswordNode(serializedNode.text);
  }

  setPassword(newText: string) {
    const writableNode = this.getWritable();
    writableNode.__realText = newText;
    writableNode.setTextContent('•'.repeat(newText.length));
  }

  getRealText(): string {
    return this.__realText;
  }
}

export function $createPasswordNode(text = ''): PasswordNode {
  return new PasswordNode(text);
}

export function $isPasswordNode(node: any): node is PasswordNode {
  return node instanceof PasswordNode;
}
