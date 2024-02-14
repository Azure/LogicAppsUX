import type { TokenNodeProps } from '../nodes/tokenNode';
import { $createTokenNode, TokenNode } from '../nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { $getSelection, $isRangeSelection, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export const INSERT_TOKEN_NODE: LexicalCommand<TokenNodeProps> = createCommand();

export interface InsertTokenNodeProps {
  closeTokenPicker: () => void;
}

export default function InsertTokenNode({ closeTokenPicker }: InsertTokenNodeProps): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('InsertTokenNodePlugin: TokenNode not registered on editor');
    }

    return editor.registerCommand<TokenNodeProps>(
      INSERT_TOKEN_NODE,
      (payload: TokenNodeProps) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection) && payload.data.token) {
          const { value } = payload.data.token;
          const tokenNode = $createTokenNode({ ...payload, value, readonly: false });
          selection.insertNodes([tokenNode]);
        }
        closeTokenPicker();
        return true;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor, closeTokenPicker]);

  return null;
}
