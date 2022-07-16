import type { Segment } from '..';
import { ValueSegmentType } from '../../models/parameter';
import { $isTokenNode } from '../nodes/tokenNode';
import type { EditorState, ElementNode } from 'lexical';
import { $getNodeByKey, $getRoot, $isElementNode, $isTextNode } from 'lexical';

export function serializeEditorState(editorState: EditorState): Segment[] {
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
