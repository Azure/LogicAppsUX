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
    const segmentValue = segment.value;
    if (segment.type === ValueSegmentType.TOKEN && segment.token) {
      const { brandColor, icon, title, name } = segment.token;

      if (brandColor && icon && (title || name)) {
        const token = $createTokenNode({ icon, title: title ?? name, value: segmentValue, brandColor, data: segment });
        tokensEnabled && paragraph.append(token);
      }
    } else {
      const splitSegment = segmentValue.split('\n');
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
