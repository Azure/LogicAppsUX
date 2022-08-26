import type { ValueSegment } from '../../editor';
import { $isTokenNode, TokenNode } from '../../editor/base/nodes/tokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { LexicalCommand } from 'lexical';
import { $getNodeByKey, COMMAND_PRIORITY_EDITOR, createCommand } from 'lexical';
import { useEffect } from 'react';

export interface updateTokenProps {
  nodeKey: string;
  updatedValue: string;
  updatedData: ValueSegment;
  updatedTitle: string;
}

export const UPDATE_TOKEN_NODE: LexicalCommand<updateTokenProps> = createCommand();

export default function UpdateTokenNode(): null {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (!editor.hasNodes([TokenNode])) {
      throw new Error('UpdateTokenNodePlugin: TokenNode not registered on editor');
    }

    return editor.registerCommand(
      UPDATE_TOKEN_NODE,
      (payload: updateTokenProps) => {
        editor.update(() => {
          const node = $getNodeByKey(payload.nodeKey);
          if ($isTokenNode(node)) {
            node.updateContent(payload, payload.updatedData);
            node.selectNext();
          }
        });
        return false;
      },
      COMMAND_PRIORITY_EDITOR
    );
  }, [editor]);

  return null;
}
