import { $isTokenNode } from '../nodes/tokenNode';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, ElementNode } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';
import { useState } from 'react';

export interface ValidationProps {
  type: 'ARRAY' | 'JSON';
  className?: string;
  tokensEnabled?: boolean;
  errorMessage: string;
}

export const Validation = ({ className, type, tokensEnabled = true, errorMessage }: ValidationProps) => {
  const [isValid, setIsValid] = useState(false);
  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), tokensEnabled);
      if (type === 'ARRAY') {
        setIsValid(validArray(editorString));
      }
    });
  };
  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {isValid ? null : errorMessage}
    </div>
  );
};

const getChildrenNodes = (node: ElementNode, tokensEnabled: boolean): string => {
  let text = '';
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return (text += getChildrenNodes(childNode, tokensEnabled) + '\n');
    }
    if ($isTextNode(childNode)) {
      text += childNode.__text.trim();
    } else if (tokensEnabled && $isTokenNode(childNode)) {
      text += childNode.__title;
    }
    return text;
  });
  return text;
};

const validArray = (s: string): boolean => {
  console.log(s);
  return false;
};
