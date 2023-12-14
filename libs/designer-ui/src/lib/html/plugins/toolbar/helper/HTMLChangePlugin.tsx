import type { ValueSegment } from '../../../../editor';
import { convertStringToSegments } from '../../../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../../../editor/base/utils/helper';
import { decodeStringSegmentTokensInDomContext } from '../../../../editor/base/utils/parsesegments';
import {
  cleanHtmlString,
  cleanStyleAttribute,
  decodeSegmentValueInLexicalContext,
  encodeSegmentValueInLexicalContext,
  getDomFromHtmlEditorString,
  isAttributeSupportedByLexical,
  isHtmlStringValueSafeForLexical,
} from './util';
import { $generateHtmlFromNodes } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';

interface HTMLChangePluginProps {
  isValuePlaintext: boolean;
  loadParameterValueFromString?: (value: string) => ValueSegment[];
  setIsValuePlaintext: (isValuePlaintext: boolean) => void;
  setValue: (newVal: ValueSegment[]) => void;
}

export const HTMLChangePlugin = ({
  isValuePlaintext,
  loadParameterValueFromString,
  setIsValuePlaintext,
  setValue,
}: HTMLChangePluginProps) => {
  const onChange = (editorState: EditorState, editor: LexicalEditor) => {
    const nodeMap = new Map<string, ValueSegment>();
    let isNewValuePlaintext = isValuePlaintext;

    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), nodeMap);
      if (!isHtmlStringValueSafeForLexical(editorString, nodeMap)) {
        isNewValuePlaintext = false;
        setIsValuePlaintext(false);
      }

      convertEditorState(editor, nodeMap, { isValuePlaintext: isNewValuePlaintext, loadParameterValueFromString }).then(setValue);
    });
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};

export const convertEditorState = (
  editor: LexicalEditor,
  nodeMap: Map<string, ValueSegment>,
  options: {
    isValuePlaintext: boolean;
    loadParameterValueFromString?: HTMLChangePluginProps['loadParameterValueFromString'];
  }
): Promise<ValueSegment[]> => {
  const { isValuePlaintext, loadParameterValueFromString } = options;

  return new Promise((resolve) => {
    const valueSegments: ValueSegment[] = [];
    editor.update(() => {
      const htmlEditorString = isValuePlaintext ? $getRoot().getTextContent() : $generateHtmlFromNodes(editor);

      // Create a temporary DOM element to parse the HTML string
      const tempElement = getDomFromHtmlEditorString(htmlEditorString, nodeMap);

      // Loop through all elements and remove unwanted attributes
      const elements = tempElement.querySelectorAll('*');
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const attributes = Array.from(element.attributes);
        for (let j = 0; j < attributes.length; j++) {
          const attribute = attributes[j];
          if (!isAttributeSupportedByLexical(element.tagName, attribute.name)) {
            element.removeAttribute(attribute.name);
            continue;
          }
          if (attribute.name === 'id') {
            const idValue = element.getAttribute('id') ?? ''; // e.g., "@{concat('&lt;', '"')}"
            const encodedIdValue = encodeSegmentValueInLexicalContext(idValue); // e.g., "@{concat('%26lt;', '%22')}"
            element.setAttribute('id', encodedIdValue);
            continue;
          }
          if (attribute.name === 'style') {
            const newAttributeValue = cleanStyleAttribute(attribute.value);
            newAttributeValue ? element.setAttribute('style', newAttributeValue) : element.removeAttribute(attribute.name);
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
