import type { ArrayEditorItemProps } from '..';
import type { ValueSegment } from '../../editor';
import { ValueSegmentType } from '../../editor';
import { serializeEditorState } from '../../editor/base/utils/editorToSegement';
import { showCollapsedValidation, getChildrenNodes, isValidArray } from '../../editor/base/utils/helper';
import { serializeArray } from '../util/serializecollapsedarray';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { guid } from '@microsoft-logic-apps/utils';
import type { EditorState } from 'lexical';
import { $getRoot } from 'lexical';

export interface CollapsedArrayValidationProps {
  className?: string;
  errorMessage: string;
  isValid: boolean;
  collapsedValue?: ValueSegment[];
  setIsValid: (b: boolean) => void;
  setItems: (items: ArrayEditorItemProps[]) => void;
  setCollapsedValue: (val: ValueSegment[]) => void;
}

export const CollapsedArrayValidation = ({
  className,
  isValid,
  errorMessage,
  collapsedValue,
  setIsValid,
  setItems,
  setCollapsedValue,
}: CollapsedArrayValidationProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      const editorString = getChildrenNodes($getRoot());
      let newValiditity = true;
      if (!editorString.trim().length || editorString === '[]') {
        setIsValid(newValiditity);
        setItems([]);
        setCollapsedValue([{ id: guid(), type: ValueSegmentType.LITERAL, value: editorString }]);
      } else {
        newValiditity = isValidArray(editorString);
        setIsValid(newValiditity);
        if (newValiditity) {
          serializeArray(editor, setItems);
        } else {
          setCollapsedValue(serializeEditorState(editor.getEditorState()));
        }
      }
    });
  };

  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {isValid || (collapsedValue && showCollapsedValidation(collapsedValue)) ? null : errorMessage}
    </div>
  );
};
