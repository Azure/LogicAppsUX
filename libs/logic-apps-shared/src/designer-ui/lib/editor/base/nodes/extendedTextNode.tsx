import type { DOMConversion, DOMConversionMap, DOMConversionOutput, SerializedTextNode, Spread } from 'lexical';
import { $isTextNode, TextNode } from 'lexical';

// Since the TextNode is foundational to all Lexical packages, including the
// plain text use case. Handling any rich text logic is undesirable. This
// creates a need to override the TextNode to handle serialization and
// deserialization of HTML/CSS styling properties to achieve full fidelity
// between JSON <-> HTML. Since this is a very popular use case, below we are
// proving a recipe to handle the most common use cases.

export type SerializedExtendedTextNode = Spread<
  {
    type: 'extended-text';
  },
  SerializedTextNode
>;

export class ExtentedTextNode extends TextNode {
  static getType(): string {
    return 'extended-text';
  }

  static clone(node: ExtentedTextNode): ExtentedTextNode {
    return new ExtentedTextNode(node.__text, node.__key);
  }

  static importDOM(): DOMConversionMap | null {
    const importers = TextNode.importDOM();
    return {
      ...importers,
      code: () => ({
        conversion: patchStyleConversion(importers?.['code']),
        priority: 1,
      }),
      em: () => ({
        conversion: patchStyleConversion(importers?.['em']),
        priority: 1,
      }),
      span: () => ({
        conversion: patchStyleConversion(importers?.['span']),
        priority: 1,
      }),
      strong: () => ({
        conversion: patchStyleConversion(importers?.['strong']),
        priority: 1,
      }),
      sub: () => ({
        conversion: patchStyleConversion(importers?.['sub']),
        priority: 1,
      }),
      sup: () => ({
        conversion: patchStyleConversion(importers?.['sup']),
        priority: 1,
      }),
    };
  }

  static importJSON(serializedNode: SerializedTextNode): TextNode {
    return TextNode.importJSON(serializedNode);
  }

  exportJSON(): SerializedExtendedTextNode {
    return {
      text: this.__text,
      format: this.__format,
      detail: this.__detail,
      style: this.__style,
      type: 'extended-text',
      mode: 'normal',
      version: 1,
    };
  }
}

function patchStyleConversion(
  originalDOMConverter?: (node: HTMLElement) => DOMConversion | null
): (node: HTMLElement) => DOMConversionOutput | null {
  return (node) => {
    const original = originalDOMConverter?.(node);
    if (!original) {
      return null;
    }
    const originalOutput = original.conversion(node);
    if (!originalOutput) {
      return originalOutput;
    }
    const backgroundColor = node.style.backgroundColor;
    const color = node.style.color;
    const fontFamily = node.style.fontFamily;
    const fontWeight = node.style.fontWeight;
    const fontSize = node.style.fontSize;
    const textDecoration = node.style.textDecoration;
    return {
      ...originalOutput,
      forChild: (lexicalNode, parent) => {
        const originalForChild = originalOutput?.forChild ?? ((x) => x);
        const result = originalForChild(lexicalNode, parent);
        if ($isTextNode(result)) {
          const style = [
            backgroundColor ? `background-color: ${backgroundColor}` : null,
            color ? `color: ${color}` : null,
            fontFamily ? `font-family: ${fontFamily}` : null,
            fontWeight ? `font-weight: ${fontWeight}` : null,
            fontSize ? `font-size: ${fontSize}` : null,
            textDecoration ? `text-decoration: ${textDecoration}` : null,
          ]
            .filter((value) => value != null)
            .join('; ');
          if (style.length) {
            return result.setStyle(style);
          }
        }
        return result;
      },
    };
  };
}

export function $createExtendedTextNode(text: string, styles?: string, format?: number) {
  const newNode = new ExtentedTextNode(text);
  newNode.setStyle(styles ?? '');
  newNode.setFormat(format ?? 0);
  return newNode;
}
