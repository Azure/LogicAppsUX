import { TokenPickerMode } from '../../../tokenpicker';
import { INITIALIZE_TOKENPICKER_AGENT_PARAMETER } from '../../../tokenpicker/plugins/InitializeTokenPickerAgentParameterHandler';
import { INITIALIZE_TOKENPICKER_EXPRESSION } from '../../../tokenpicker/plugins/InitializeTokenPickerExpressionHandler';
import type { Token } from '../../models/parameter';
import { TokenType } from '../../models/parameter';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export interface OPEN_TOKEN_PICKER_PAYLOAD {
  token: Token;
  nodeKey: string;
}

export const OPEN_TOKEN_PICKER: LexicalCommand<OPEN_TOKEN_PICKER_PAYLOAD> = createCommand();

export interface OpenTokenPickerProps {
  openTokenPicker: (tokenPickerMode: TokenPickerMode, callback?: () => void) => void;
}

export default function OpenTokenPicker({ openTokenPicker }: OpenTokenPickerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      OPEN_TOKEN_PICKER,
      (payload: OPEN_TOKEN_PICKER_PAYLOAD) => {
        const { token } = payload;
        if (token?.tokenType === TokenType.FX) {
          openTokenPicker(TokenPickerMode.EXPRESSION, () => {
            editor.dispatchCommand(INITIALIZE_TOKENPICKER_EXPRESSION, payload);
          });
        } else if (token?.tokenType === TokenType.AGENTPARAMETER) {
          openTokenPicker(TokenPickerMode.AGENT_PARAMETER_ADD, () => {
            editor.dispatchCommand(INITIALIZE_TOKENPICKER_AGENT_PARAMETER, payload);
          });
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, openTokenPicker]);

  return null;
}
