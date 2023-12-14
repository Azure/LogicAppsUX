import { BaseEditor, type BaseEditorProps } from '../..';
import { defaultInitialConfig, defaultNodes, htmlNodes } from './utils/initialConfig';
import type { SegmentParserOptions } from './utils/parsesegments';
import { parseHtmlSegments, parseSegments } from './utils/parsesegments';
import type { InitialConfigType } from '@lexical/react/LexicalComposer';
import { LexicalComposer } from '@lexical/react/LexicalComposer';

export const EditorWrapper = ({ ...props }: BaseEditorProps) => {
  const { initialValue, basePlugins = {}, loadParameterValueFromString, readonly, tokenMapping } = props;
  const { isHtmlEditor, tokens } = basePlugins;
  const initialConfig: InitialConfigType = {
    ...defaultInitialConfig,
    editable: !readonly,
    nodes: isHtmlEditor ? htmlNodes : defaultNodes,
    editorState:
      initialValue &&
      (() => {
        const options: SegmentParserOptions = {
          loadParameterValueFromString,
          readonly,
          segmentMapping: tokenMapping,
          tokensEnabled: tokens,
        };
        isHtmlEditor ? parseHtmlSegments(initialValue, options) : parseSegments(initialValue, options);
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
