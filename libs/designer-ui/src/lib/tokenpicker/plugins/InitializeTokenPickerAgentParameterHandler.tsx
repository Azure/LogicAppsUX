import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand, NodeKey } from 'lexical';
import { COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import type { OPEN_TOKEN_PICKER_PAYLOAD } from '../../editor/base/plugins/OpenTokenPicker';
import { useEffect } from 'react';
import type { Token } from '../../editor/models/parameter';

export const INITIALIZE_TOKENPICKER_AGENT_PARAMETER: LexicalCommand<OPEN_TOKEN_PICKER_PAYLOAD> = createCommand();

interface TokenPickerHandlerProps {
  handleInitializeAgentParameter?: (s: Token, n: NodeKey) => void;
}

export default function TokenPickerAgentParameterHandler({ handleInitializeAgentParameter }: TokenPickerHandlerProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand<OPEN_TOKEN_PICKER_PAYLOAD>(
      INITIALIZE_TOKENPICKER_AGENT_PARAMETER,
      (payload: OPEN_TOKEN_PICKER_PAYLOAD) => {
        const { token, nodeKey } = payload;
        if (token) {
          handleInitializeAgentParameter?.(token, nodeKey);
        }
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, handleInitializeAgentParameter]);
  return null;
}
