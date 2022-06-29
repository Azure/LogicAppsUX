import type { ArrayEditorItemProps } from '..';
import type { Segment } from '../../editor/base';
import { $isTokenNode } from '../../editor/base/nodes/tokenNode';
import { ValueSegmentType } from '../../editor/models/parameter';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { clone } from '@microsoft-logic-apps/utils';
import type { ElementNode } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

export interface SerializeProps {
  isValid: boolean;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
}

export const Serialize = ({ isValid, setItems }: SerializeProps) => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (isValid) {
      editor.getEditorState().read(() => {
        const paragraphNodes = $getRoot().__children.map((child) => {
          return $getNodeByKey(child);
        });
        const returnItems: ArrayEditorItemProps[] = [];
        paragraphNodes.forEach((paragraphNode) => {
          if (paragraphNode && $isElementNode(paragraphNode)) {
            getItems(paragraphNode, returnItems, []);
          }
        });
        setItems(returnItems);
      });
    }
  }, [editor, isValid, setItems]);
  return null;
};

const getItems = (paragraphNode: ElementNode, returnItems: ArrayEditorItemProps[], currentSegments: Segment[]) => {
  paragraphNode.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if ($isTextNode(childNode)) {
      const splitChildNode = childNode.__text.split('"').filter((childNode) => {
        return childNode.replace(/\[|\]|,/g, '').trim().length > 0;
      });
      for (let i = 0; i < splitChildNode.length; i++) {
        if (i > 0) {
          returnItems.push({ content: clone(currentSegments) });
          while (currentSegments.length) {
            currentSegments.pop();
          }
        }
        currentSegments.push({ type: ValueSegmentType.LITERAL, value: splitChildNode[i] });
      }
    } else if ($isTokenNode(childNode)) {
      currentSegments.push({
        type: ValueSegmentType.TOKEN,
        token: {
          title: childNode.__title,
          icon: childNode.__icon,
          brandColor: childNode.__brandColor,
          description: childNode.__description,
        },
      });
    }
  });
  if (currentSegments.length > 0) {
    returnItems.push({ content: currentSegments });
  }
};
