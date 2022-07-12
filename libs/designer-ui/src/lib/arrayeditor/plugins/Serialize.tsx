import type { ArrayEditorItemProps } from '..';
import type { Segment } from '../../editor/base';
import { $isTokenNode } from '../../editor/base/nodes/tokenNode';
import { ValueSegmentType } from '../../editor/models/parameter';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, ElementNode } from 'lexical';
import { $isTextNode, $isElementNode, $getNodeByKey, $getRoot } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';

export interface SerializeProps {
  isValid: boolean;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
}

export const Serialize = ({ isValid, setItems }: SerializeProps) => {
  const onChange = (editorState: EditorState) => {
    if (isValid) {
      editorState.read(() => {
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
  };

  return <OnChangePlugin onChange={onChange} />;
};

const getItems = (paragraphNode: ElementNode, returnItems: ArrayEditorItemProps[], currentSegments: Segment[]) => {
  let inString = false;
  paragraphNode.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if ($isTextNode(childNode)) {
      const splitChildNode = childNode.__text.split(',').map((childNode) => {
        return childNode.replace(/\[|\]/g, '').trim();
      });
      for (let i = 0; i < splitChildNode.length; i++) {
        let text = splitChildNode[i];
        if (text.length === 0) {
          continue;
        }

        text = splitChildNode[i].replace(/^[^"]*"(.*)"[^"]*$/, '$1').trim();
        if (text.length === 0) {
          returnItems.push({ content: [] });
          continue;
        }
        if (text.indexOf('"') >= 0) {
          currentSegments.push({ type: ValueSegmentType.LITERAL, value: text.replace('"', '') });
          if (inString) {
            returnItems.push({ content: currentSegments.slice(0) });
            while (currentSegments.length) {
              currentSegments.pop();
            }
          }
          inString = !inString;
        } else {
          if (inString) {
            currentSegments.push({ type: ValueSegmentType.LITERAL, value: text });
          } else {
            returnItems.push({ content: [{ type: ValueSegmentType.LITERAL, value: text }] });
          }
        }
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
      if (!inString) {
        returnItems.push({ content: currentSegments });
        currentSegments.pop();
      }
    }
  });
  if (currentSegments.length > 0) {
    returnItems.push({ content: currentSegments });
  }
};
