import type { SimpleArrayItem, ComplexArrayItems, ArrayItemSchema } from '..';
import type { ValueSegment } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { showCollapsedValidation } from '../../editor/base/utils/helper';
import { serializeSimpleArray, serializeComplexArray } from '../util/serializecollapsedarray';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

export interface CollapsedArrayValidationProps {
  className?: string;
  defaultErrorMessage: string;
  isValid: boolean;
  collapsedValue?: ValueSegment[];
  itemSchema?: ArrayItemSchema;
  isComplex: boolean;
  setIsValid: (b: boolean) => void;
  setItems: ((simpleItems: SimpleArrayItem[]) => void) | ((complexItems: ComplexArrayItems[]) => void);
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedArrayValidation = ({
  className,
  isValid,
  defaultErrorMessage,
  collapsedValue,
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
        serializeSimpleArray(editor, setItems as (simpleItems: SimpleArrayItem[]) => void, setIsValid);
      }
      setCollapsedValue(serializeEditorState(editor.getEditorState()));
    });
  };

  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin ignoreSelectionChange onChange={onChange} />
      {isValid || (collapsedValue && showCollapsedValidation(collapsedValue)) ? null : defaultErrorMessage}
    </div>
  );
};
