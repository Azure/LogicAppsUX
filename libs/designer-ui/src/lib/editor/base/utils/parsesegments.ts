import type { ValueSegment } from '../../models/parameter';
import { ValueSegmentType } from '../../models/parameter';
import { $createTokenNode } from '../nodes/tokenNode';
import type { ParagraphNode, RootNode } from 'lexical';
import { $isParagraphNode, $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const parseSegments = (value: ValueSegment[], tokensEnabled?: boolean): RootNode => {
  const root = $getRoot();
  const rootChild = root.getFirstChild();
  let paragraph: ParagraphNode;
  if ($isParagraphNode(rootChild)) {
    paragraph = rootChild;
  } else {
    paragraph = $createParagraphNode();
  }

  value.forEach((segment) => {
    if (segment.type === ValueSegmentType.TOKEN && segment.token) {
      const { brandColor, icon, title, value } = segment.token;
      if (brandColor && value && icon && title) {
        const token = $createTokenNode({ icon, title, value, brandColor, data: segment });
        tokensEnabled && paragraph.append(token);
      }
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
