import type { Segment } from '.';
import { ValueSegmentType } from '.';
import { $createTokenNode } from './nodes/tokenNode';
import { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

export const prepopulatedRichText = (initialValue: Segment[], tokensEnabled?: boolean) => {
  const root = $getRoot();
  let paragraph = $createParagraphNode();
  if (root.getFirstChild() === null) {
    initialValue.forEach((segment) => {
      if (segment.type === ValueSegmentType.TOKEN) {
        const { brandColor, description, icon, title } = segment.token;
        tokensEnabled && paragraph.append($createTokenNode(icon, title, description));
      } else {
        const splitSegment = segment.value.split('\n');
        console.log(splitSegment);
        paragraph.append($createTextNode(splitSegment[0]));
        for (let i = 1; i < splitSegment.length; i++) {
          root.append(paragraph);
          paragraph = $createParagraphNode();
          paragraph.append($createTextNode(splitSegment[i]));
        }
      }
    });
    root.append(paragraph);
  }
};
