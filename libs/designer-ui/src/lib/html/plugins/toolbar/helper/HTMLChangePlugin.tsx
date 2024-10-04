import type { ValueSegment } from '../../../../editor';
import { convertStringToSegments } from '../../../../editor/base/utils/editorToSegment';
import { getChildrenNodes } from '../../../../editor/base/utils/helper';
import {
  decodeStringSegmentTokensInDomContext,
  decodeStringSegmentTokensInLexicalContext,
  processStringSegmentTokensInDomAndLexicalContext,
  encodeStringSegmentTokensInLexicalContext,
} from '../../../../editor/base/utils/parsesegments';
import {
  cleanHtmlString,
  cleanStyleAttribute,
  encodeSegmentValueInLexicalContext,
  getDomFromHtmlEditorString,
  isAttributeSupportedByHtmlEditor,
  isHtmlStringValueSafeForLexical,
} from './util';
import { $generateHtmlFromNodes } from '@lexical/html';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState, LexicalEditor } from 'lexical';
import { $getRoot } from 'lexical';
import { removeAllNewlines } from '../../../../utils';

export interface HTMLChangePluginProps {
  isValuePlaintext: boolean;
  setIsSwitchFromPlaintextBlocked: (value: boolean) => void;
  setValue: (newVal: ValueSegment[]) => void;
}

export const HTMLChangePlugin = ({ isValuePlaintext, setIsSwitchFromPlaintextBlocked, setValue }: HTMLChangePluginProps) => {
  const onChange = (editorState: EditorState, editor: LexicalEditor) => {
    const nodeMap = new Map<string, ValueSegment>();

    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot(), nodeMap);
      const isSafeForLexical = isHtmlStringValueSafeForLexical(editorString, nodeMap);

      setIsSwitchFromPlaintextBlocked(!isSafeForLexical);

      convertEditorState(editor, nodeMap, { isValuePlaintext }).then(setValue);
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

      const idValues: string[] = [];
      // Loop through all elements and remove unwanted attributes
      const elements = tempElement.querySelectorAll('*');
      // biome-ignore lint/style/useForOf: Node List isn't iterable
      for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const attributes = Array.from(element.attributes);
        for (const attribute of attributes) {
          if (!isAttributeSupportedByHtmlEditor(element.tagName, attribute.name)) {
            element.removeAttribute(attribute.name);
            continue;
          }
          if (attribute.name === 'id' && !isValuePlaintext) {
            // If we're in the rich HTML editor, encoding occurs at the element level since they are all wrapped in <span>.
            const idValue = decodeURIComponent(element.getAttribute('id') ?? ''); // e.g., "@{concat('&lt;', '"')}"
            idValues.push(idValue);
            const encodedIdValue = encodeSegmentValueInLexicalContext(idValue); // e.g., "@{concat('%26lt;', '%22')}"
            element.setAttribute('id', encodedIdValue);
            continue;
          }
          if (attribute.name === 'style') {
            const newAttributeValue = cleanStyleAttribute(attribute.value);
            newAttributeValue ? element.setAttribute('style', newAttributeValue) : element.removeAttribute(attribute.name);
          }
        }
      }

      // Clean the HTML string and decode the token nodes since `nodeMap` keys are always decoded.
      const cleanedHtmlString = cleanHtmlString(tempElement.innerHTML);
      const decodedHtmlString = decodeStringSegmentTokensInDomContext(cleanedHtmlString, nodeMap);
      const decodedLexicalString = decodeStringSegmentTokensInLexicalContext(decodedHtmlString, nodeMap);

      // Replace `<span id="..."></span>` with the captured `id` value if it is found in the viable IDs map.
      const spanIdPattern = /<span id="(.*?)"><\/span>/;
      let noTokenSpansString = decodedLexicalString;
      let decodedLexicalStringWithoutNewlines = decodedLexicalString.replace(/\n/g, '');
      let replacedSpan = false;
      for (const idValue of idValues) {
        if (canReplaceSpanWithId(idValue, nodeMap)) {
          replacedSpan = true;
          decodedLexicalStringWithoutNewlines = decodedLexicalStringWithoutNewlines.replace(spanIdPattern, idValue);
        }
      }
      if (replacedSpan) {
        noTokenSpansString = decodedLexicalStringWithoutNewlines;
      }
      const valueSegments: ValueSegment[] = convertStringToSegments(noTokenSpansString, nodeMap, {
        tokensEnabled: true,
        convertSpaceToNewline: true,
      });
      resolve(valueSegments);
    });
  });
};

export const canReplaceSpanWithId = (idValue: string, nodeMap: Map<string, ValueSegment>): boolean => {
  const processedId = removeAllNewlines(idValue);
  for (const [key, value] of nodeMap) {
    const processedKey = removeAllNewlines(key);
    const encodedProcessedKey = processStringSegmentTokensInDomAndLexicalContext(processedKey, nodeMap, true);
    const decodedProcessedKey = processStringSegmentTokensInDomAndLexicalContext(processedKey, nodeMap, false);
    if (
      (processedId === processedKey || processedId === encodedProcessedKey || processedId === decodedProcessedKey) &&
      value !== undefined
    ) {
      return true;
    }
  }
  return false;
};
