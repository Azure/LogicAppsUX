import type { ValueSegment } from '../../../../editor';
import { convertStringToSegments } from '../../../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../../../editor/base/utils/helper';
import {
  decodeStringSegmentTokensInDomContext,
  decodeStringSegmentTokensInLexicalContext,
  encodeStringSegmentTokensInLexicalContext,
} from '../../../../editor/base/utils/parsesegments';
import {
  cleanHtmlString,
  cleanStyleAttribute,
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
  setIsValuePlaintext: (isValuePlaintext: boolean) => void;
  setValue: (newVal: ValueSegment[]) => void;
}

export const HTMLChangePlugin = ({ isValuePlaintext, setIsValuePlaintext, setValue }: HTMLChangePluginProps) => {
  const onChange = (editorState: EditorState, editor: LexicalEditor) => {
    const nodeMap = new Map<string, ValueSegment>();
    let isNewValuePlaintext = isValuePlaintext;

    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), nodeMap);
      if (!isHtmlStringValueSafeForLexical(editorString, nodeMap)) {
        isNewValuePlaintext = true;
        setIsValuePlaintext(isNewValuePlaintext);
      }

      convertEditorState(editor, nodeMap, { isValuePlaintext: isNewValuePlaintext }).then(setValue);
    });
  };
  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};

export const convertEditorState = (
  editor: LexicalEditor,
  nodeMap: Map<string, ValueSegment>,
  options: {
    isValuePlaintext: boolean;
  }
): Promise<ValueSegment[]> => {
  const { isValuePlaintext } = options;

  return new Promise((resolve) => {
    editor.update(() => {
      let htmlEditorString = isValuePlaintext ? $getRoot().getTextContent() : $generateHtmlFromNodes(editor);

      if (isValuePlaintext) {
        // If we're in the raw HTML editor, the tokens are not wrapped in <span> and thus have to be encoded before
        // the string is converted into DOM elements.
        htmlEditorString = encodeStringSegmentTokensInLexicalContext(htmlEditorString, nodeMap);
      }

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
          if (attribute.name === 'id' && !isValuePlaintext) {
            // If we're in the rich HTML editor, encoding occurs at the element level since they are all wrapped in <span>.
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

      // Clean the HTML string and decode the token nodes since `nodeMap` keys are always decoded.
      const cleanedHtmlString = cleanHtmlString(tempElement.innerHTML);
      const decodedHtmlString = decodeStringSegmentTokensInDomContext(cleanedHtmlString, nodeMap);
      const decodedLexicalString = decodeStringSegmentTokensInLexicalContext(decodedHtmlString, nodeMap);

      // Replace `<span id="..."></span>` with the captured `id` value if it is found in the viable IDs map.
      const spanIdPattern = /<span id="(.*?)"><\/span>/g;
      const noTokenSpansString = decodedLexicalString.replace(spanIdPattern, (match, idValue) => {
        if (nodeMap.get(idValue)) {
          return idValue;
        } else {
          return match;
        }
      });
      const valueSegments: ValueSegment[] = convertStringToSegments(noTokenSpansString, true, nodeMap);
      resolve(valueSegments);
    });
  });
};
