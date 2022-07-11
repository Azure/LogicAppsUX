import type { ArrayEditorItemProps } from '..';
import { ValueSegmentType } from '../../editor';
import type { Segment } from '../../editor/base';
import { $isTokenNode } from '../../editor/base/nodes/tokenNode';
import { parseSegments } from '../../editor/base/parsesegments';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, ElementNode } from 'lexical';
import { CLEAR_EDITOR_COMMAND, $getNodeByKey, $getRoot, $isElementNode, $isTextNode } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useState, useEffect } from 'react';

interface updateStateProps {
  item: Segment[];
  items: ArrayEditorItemProps[];
  index: number;
  setItems: Dispatch<SetStateAction<ArrayEditorItemProps[]>>;
}

export const OnChange = ({ item, items, index, setItems }: updateStateProps) => {
  const [editor] = useLexicalComposerContext();
  const [itemLength, setItemLength] = useState(items.length);
  useEffect(() => {
    if (itemLength !== items.length) {
      editor.dispatchCommand(CLEAR_EDITOR_COMMAND, undefined);
      editor.focus();
      editor.update(() => {
        parseSegments(item, true);
      });
      setItemLength(items.length);
    }
  }, [editor, item, itemLength, items.length]);

  const onChange = (editorState: EditorState) => {
    const newValue = serializeEditorState(editorState);
    if (notEqual(item, newValue)) {
      const newItems = [...items];
      newItems[index] = { content: serializeEditorState(editorState) };
      setItems(newItems);
      editor.focus();
    }
  };
  return <OnChangePlugin onChange={onChange} />;
};

function serializeEditorState(editorState: EditorState): Segment[] {
  const segments: Segment[] = [];
  editorState.read(() => {
    getChildrenNodes($getRoot(), segments);
  });
  return segments;
}
const getChildrenNodes = (node: ElementNode, segments: Segment[]): void => {
  node.__children.forEach((child) => {
    const childNode = $getNodeByKey(child);
    if (childNode && $isElementNode(childNode)) {
      return getChildrenNodes(childNode, segments);
    }
    if ($isTextNode(childNode)) {
      segments.push({ type: ValueSegmentType.LITERAL, value: childNode.__text });
    } else if ($isTokenNode(childNode)) {
      segments.push({
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
};

const notEqual = (a: Segment[], b: Segment[]): boolean => {
  if (a.length !== b.length) {
    return true;
  }
  for (let i = 0; i < a.length; i++) {
    if (a[i].type !== b[i].type) {
      return true;
    }
    if (JSON.stringify(a[i]) !== JSON.stringify(b[i])) {
      return true;
    }
  }
  return false;
};
