import type { ValueSegment } from '../../../../editor';
import { convertStringToSegments } from '../../../../editor/base/utils/editorToSegement';
import { getChildrenNodes } from '../../../../editor/base/utils/helper';
import { cleanHtmlString, decodeSegmentValue, encodeSegmentValue } from './util';
import { $generateHtmlFromNodes } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

interface HTMLChangePluginProps {
  setValue: (newVal: ValueSegment[]) => void;
}

export const HTMLChangePlugin = ({ setValue }: HTMLChangePluginProps) => {
  const onChange = (editorState: EditorState, editor: LexicalEditor) => {
    const nodeMap = new Map<string, ValueSegment>();
    editorState.read(() => {
      getChildrenNodes($getRoot(), nodeMap);
    });
    convertEditorState(editor, nodeMap).then(setValue);
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};

const convertEditorState = (editor: LexicalEditor, nodeMap: Map<string, ValueSegment>): Promise<ValueSegment[]> => {
  return new Promise((resolve) => {
    const valueSegments: ValueSegment[] = [];
    editor.update(() => {
      const htmlEditorString = $generateHtmlFromNodes(editor);
      // Create a temporary DOM element to parse the HTML string
      const tempElement = document.createElement('div');
      tempElement.innerHTML = htmlEditorString;

      // Loop through all elements and remove unwanted attributes
      const elements = tempElement.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const attributes = Array.from(element.attributes);
        for (let j = 0; j < attributes.length; j++) {
          const attribute = attributes[j];
          if (attribute.name !== 'id' && attribute.name !== 'style' && attribute.name !== 'href') {
            element.removeAttribute(attribute.name);
          }
          if (attribute.name === 'id') {
            const idValue = element.getAttribute('id') ?? ''; // e.g., "$[concat(...),concat('&lt;', '"'),#AD008C]$"
            const encodedIdValue = encodeSegmentValue(idValue); // e.g., "$[concat(...),concat('%26lt;', '%22'),#AD008C]$"
            element.setAttribute('id', encodedIdValue);
          }
        }
      }

      // Get the cleaned HTML string
      const cleanedHtmlString = cleanHtmlString(tempElement.innerHTML);

      // Regular expression pattern to match <span id="..."></span>
      const spanIdPattern = /<span id="(.*?)"><\/span>/g;
      // Replace <span id="..."></span> with the captured "id" value if it is found in the viable ids map
      const removeTokenTags = cleanedHtmlString.replace(spanIdPattern, (match, idValue) => {
        const decodedIdValue = decodeSegmentValue(idValue);
        if (nodeMap.get(decodedIdValue)) {
          return decodedIdValue;
        } else {
          return match;
        }
      });
      valueSegments.push(...convertStringToSegments(removeTokenTags, true, nodeMap));
      resolve(valueSegments);
    });
  });
};
