import type { SimpleArrayItem, ComplexArrayItems, ArrayItemSchema } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegment';
import { serializeSimpleArray, serializeComplexArray } from '../util/serializecollapsedarray';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

export interface CollapsedArrayValidationProps {
  itemSchema: ArrayItemSchema;
  isComplex: boolean;
  setIsValid: (b: boolean) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItems[]) => void);
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedArrayValidation = ({
  itemSchema,
  isComplex,
  setIsValid,
  setItems,
  setCollapsedValue,
}: CollapsedArrayValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      if (isComplex && itemSchema) {
        serializeComplexArray(editor, itemSchema, setItems as (complexItems: ComplexArrayItems[]) => void, setIsValid);
      } else {
        serializeSimpleArray(editor, itemSchema.type, setItems as (simpleItems: SimpleArrayItem[]) => void, setIsValid);
      }
      setCollapsedValue(serializeEditorState(editor.getEditorState()));
    });
  };

  return <OnChangePlugin ignoreSelectionChange onChange={onChange} />;
};
