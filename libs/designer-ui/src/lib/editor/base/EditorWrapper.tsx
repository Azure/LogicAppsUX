import { BaseEditor, type BaseEditorProps } from '../..';
import { defaultInitialConfig, defaultNodes, htmlNodes } from './utils/initialConfig';
import { parseHtmlSegments, parseSegments } from './utils/parsesegments';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';

export const EditorWrapper = ({ ...props }: BaseEditorProps) => {
  const { initialValue, basePlugins = {}, readonly } = props;
  const { isHtmlEditor, tokens } = basePlugins;
  const initialConfig: InitialConfigType = {
    ...defaultInitialConfig,
    editable: !readonly,
    nodes: isHtmlEditor ? htmlNodes : defaultNodes,
    editorState:
      initialValue &&
      (() => {
        isHtmlEditor ? parseHtmlSegments(initialValue, tokens, readonly) : parseSegments(initialValue, tokens, readonly);
      }),
  };
  return (
    <div style={{ width: '100%' }}>
      <LexicalComposer initialConfig={initialConfig}>
        <BaseEditor {...props} />
      </LexicalComposer>
    </div>
  );
};
