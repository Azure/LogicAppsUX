import Constants from '../constants';
import {
  createCompletionItemProviderForFunctions,
  createCompletionItemProviderForValues,
  createSignatureHelpProvider,
  createLanguageDefinition,
  createThemeData,
  createLanguageConfig,
  getTemplateFunctions,
} from '../workflow/languageservice/workflowlanguageservice';
import { map } from '@microsoft-logic-apps/utils';
import Editor, { loader } from '@monaco-editor/react';
import type * as monaco from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useEffect } from 'react';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
  templateExpressionLanguage = 'TemplateExpressionLanguage',
}

export interface EditorProps extends EditorOptions {
  editorRef?: MutableRefObject<monaco.editor.IStandaloneCodeEditor | null>;
  defaultValue?: string;
  height?: number | string;
  language?: EditorLanguage;
  width?: number | string;
  value?: string;
}

export interface EditorOptions {
  folding?: boolean;
  fontSize?: number;
  readOnly?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  minimapEnabled?: boolean;
  scrollBeyondLastLine?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}

export const CustomEditor: React.FC<EditorProps> = ({
  editorRef,
  height,
  width,
  minimapEnabled = true,
  value,
  language,
  defaultValue,
  ...options
}): JSX.Element => {
  const initEditor = () => {
    const languageName = Constants.LANGUAGE_NAMES.WORKFLOW;
    const templateFunctions = getTemplateFunctions();

    loader.init().then((monaco) => {
      if (!monaco.languages.getLanguages().some((lang: any) => lang.id === languageName)) {
        // Register a new language
        monaco.languages.register({ id: languageName });
        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider(languageName, createLanguageDefinition(templateFunctions));

        // Register Suggestion text for the language
        monaco.languages.registerCompletionItemProvider(languageName, createCompletionItemProviderForFunctions(templateFunctions));
        monaco.languages.registerCompletionItemProvider(languageName, createCompletionItemProviderForValues());

        // Register Help Provider Text Field for the language
        monaco.languages.registerSignatureHelpProvider(languageName, createSignatureHelpProvider(map(templateFunctions, 'name')));

        monaco.languages.setLanguageConfiguration(languageName, createLanguageConfig());
        // Define a new theme that contains only rules that match this language
        monaco.editor.defineTheme(languageName, createThemeData());
      }
    });
  };

  useEffect(() => {
    initEditor();
  }, []);

  function handleEditorDidMount(editor: monaco.editor.IStandaloneCodeEditor) {
    if (editorRef) {
      editorRef.current = editor;
    }
  }

  return (
    <Editor
      className="msla-monaco"
      height={height}
      width={width}
      options={{ ...options, minimap: { enabled: minimapEnabled } }}
      value={value}
      defaultValue={defaultValue}
      defaultLanguage={language ? language.toString() : undefined}
      theme={language === Constants.LANGUAGE_NAMES.WORKFLOW ? language : 'light'}
      onMount={handleEditorDidMount}
    />
  );
};

export default CustomEditor;
