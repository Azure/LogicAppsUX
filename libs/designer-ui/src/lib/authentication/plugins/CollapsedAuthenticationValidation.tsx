import type { ValueSegment } from '../../editor';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import type { EditorState } from 'lexical';

export interface CollapsedAuthenticationValidationProps {
  className?: string;
  errorMessage: string;
  setCollapsedValue: (value: ValueSegment[]) => void;
}

export const CollapsedAuthenticationValidation = ({ className, errorMessage }: CollapsedAuthenticationValidationProps): JSX.Element => {
  const onChange = (editorState: EditorState) => {
    editorState.read(() => {
      console.log('read');
    });
  };

  return (
    <div className={className ?? 'msla-base-editor-validation'}>
      <OnChangePlugin onChange={onChange} />
      {errorMessage ?? null}
    </div>
  );
};
