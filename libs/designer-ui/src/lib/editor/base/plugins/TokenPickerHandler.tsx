import { findChildNode } from '../utils/helper';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { $getRoot, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import type { Dispatch, SetStateAction } from 'react';
import { useEffect } from 'react';

export const CHANGE_TOKENPICKER_EXPRESSION: LexicalCommand<string> = createCommand();

interface TokenPickerHandlerProps {
  setInitialExpression?: Dispatch<SetStateAction<string>>;
}

export default function TokenPickerHandler({ setInitialExpression }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<string>(
      CHANGE_TOKENPICKER_EXPRESSION,
      (payload: string) => {
        setInitialExpression?.(findChildNode($getRoot(), payload)?.token?.value ?? '');
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, setInitialExpression]);

  return null;
}
