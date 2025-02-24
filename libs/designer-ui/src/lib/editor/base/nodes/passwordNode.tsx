import type { SerializedTextNode, Spread } from 'lexical';
import { TextNode } from 'lexical';

export type SerializedPasswordNode = Spread<
  {
    type: 'password';
  },
  SerializedTextNode
>;

export class PasswordNode extends TextNode {
  private __realText: string; // Store actual password

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
    return this.__realText; // Ensure real password is returned when needed
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.className = 'password-mask';
    span.textContent = '•'.repeat(this.__realText.length);
    return span;
  }

  updateDOM(prevNode: PasswordNode, dom: HTMLElement): boolean {
    if (this.__realText !== prevNode.__realText) {
      dom.textContent = '•'.repeat(this.__realText.length);
    }
    return false; // Prevent unnecessary re-renders
  }

  exportJSON(): SerializedPasswordNode {
    return {
      format: this.__format,
      detail: this.__detail,
      style: this.__style,
      mode: 'normal',
      type: 'password',
      text: this.__realText, // Serialize the real password
      version: 1,
    };
  }

  static importJSON(serializedNode: any): PasswordNode {
    return new PasswordNode(serializedNode.text);
  }

  // Update the password while keeping masked display
  setPassword(text: string): void {
    this.__realText = text;
    this.getWritable().setTextContent('•'.repeat(text.length));
  }
}

export function $createPasswordNode(text = ''): PasswordNode {
  return new PasswordNode(text);
}

export function $isPasswordNode(node: any): node is PasswordNode {
  return node instanceof PasswordNode;
}
