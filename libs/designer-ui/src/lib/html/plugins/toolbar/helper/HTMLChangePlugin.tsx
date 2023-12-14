import type { ValueSegment } from '../../../../editor';
import { convertStringToSegments } from '../../../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../../../editor/base/utils/helper';
import { decodeStringSegmentTokensInDomContext, encodeStringSegmentTokensInDomContext } from '../../../../editor/base/utils/parsesegments';
import { cleanHtmlString, decodeSegmentValueInLexicalContext, encodeSegmentValueInLexicalContext } from './util';
import { $generateHtmlFromNodes } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

interface HTMLChangePluginProps {
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  setValue: (newVal: ValueSegment[]) => void;
}

export const HTMLChangePlugin = ({ loadParameterValueFromString, setValue }: HTMLChangePluginProps) => {
  const onChange = (editorState: EditorState, editor: LexicalEditor) => {
    const nodeMap = new Map<string, ValueSegment>();
    editorState.read(() => {
      getChildrenNodes($getRoot(), nodeMap);
    });
    convertEditorState(editor, nodeMap, { asPlainText: false, loadParameterValueFromString }).then(setValue);
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};

export const convertEditorState = (
  editor: LexicalEditor,
  nodeMap: Map<string, ValueSegment>,
  options: {
    asPlainText: boolean;
    loadParameterValueFromString?: HTMLChangePluginProps['loadParameterValueFromString'];
  }
): Promise<ValueSegment[]> => {
  const { asPlainText, loadParameterValueFromString } = options;

  return new Promise((resolve) => {
    const valueSegments: ValueSegment[] = [];
    editor.update(() => {
      const htmlEditorString = asPlainText ? $getRoot().getTextContent() : $generateHtmlFromNodes(editor);
      const encodedHtmlEditorString = encodeStringSegmentTokensInDomContext(htmlEditorString, nodeMap);
      // Create a temporary DOM element to parse the HTML string
      const tempElement = document.createElement('div');
      tempElement.innerHTML = encodedHtmlEditorString;

      // Loop through all elements and remove unwanted attributes
      const elements = tempElement.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const attributes = Array.from(element.attributes);
        for (let j = 0; j < attributes.length; j++) {
          const attribute = attributes[j];
          if (attribute.name !== 'id' && attribute.name !== 'style' && attribute.name !== 'href') {
            element.removeAttribute(attribute.name);
            continue;
          }
          if (attribute.name === 'id') {
            const idValue = element.getAttribute('id') ?? ''; // e.g., "$[concat(...),concat('&lt;', '"'),#AD008C]$"
            const encodedIdValue = encodeSegmentValueInLexicalContext(idValue); // e.g., "$[concat(...),concat('%26lt;', '%22'),#AD008C]$"
            element.setAttribute('id', encodedIdValue);
            continue;
          }
          if (attribute.name === 'style' && attribute.value === 'white-space: pre-wrap;') {
            element.removeAttribute(attribute.name);
            continue;
          }
        }
      }

      // Get the cleaned HTML string
      const cleanedHtmlString = cleanHtmlString(tempElement.innerHTML);
      const resultHtmlString = decodeStringSegmentTokensInDomContext(cleanedHtmlString, nodeMap);

      // Regular expression pattern to match <span id="..."></span>
      const spanIdPattern = /<span id="(.*?)"><\/span>/g;
      // Replace <span id="..."></span> with the captured "id" value if it is found in the viable ids map
      const removeTokenTags = resultHtmlString.replace(spanIdPattern, (match, idValue) => {
        const decodedIdValue = decodeSegmentValueInLexicalContext(idValue);
        if (nodeMap.get(decodedIdValue)) {
          return decodedIdValue;
        } else {
          return match;
        }
      });
      if (loadParameterValueFromString) {
        valueSegments.push(...loadParameterValueFromString(removeTokenTags));
      } else {
        valueSegments.push(...convertStringToSegments(removeTokenTags, true, nodeMap));
      }
      resolve(valueSegments);
    });
  });
};
