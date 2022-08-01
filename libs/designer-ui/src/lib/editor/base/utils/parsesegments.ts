import type { Segment } from '..';
import { ValueSegmentType } from '../../models/parameter';
import { $createTokenNode } from '../nodes/tokenNode';
import type { ParagraphNode, RootNode } from 'lexical';
import { $isParagraphNode, $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const parseSegments = (value: Segment[], tokensEnabled?: boolean): RootNode => {
  const root = $getRoot();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode;
  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }

  value.forEach((segment) => {
    if (segment.type === ValueSegmentType.TOKEN) {
      const { brandColor, description, icon, title } = segment.token;
      const token = $createTokenNode({ icon, title, description, brandColor });
      tokensEnabled && paragraph.append(token);
    } else {
      const splitSegment = segment.value.split('\n');
      paragraph.append($createTextNode(splitSegment[0]));
      for (let i = 1; i < splitSegment.length; i++) {
        root.append(paragraph);
        paragraph = $createParagraphNode();
        paragraph.append($createTextNode(splitSegment[i]));
      }
    }
  });
  root.append(paragraph);
  return root;
};
