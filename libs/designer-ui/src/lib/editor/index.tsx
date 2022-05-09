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
import { useRef, useEffect } from 'react';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
  templateExpressionLanguage = 'TemplateExpressionLanguage',
}

export interface EditorProps extends EditorOptions {
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
  lineHeight?: number;
  minimapEnabled?: boolean;
  scrollBeyondLastLine?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}

export const CustomEditor: React.FC<EditorProps> = ({
  height,
  width,
  minimapEnabled,
  value,
  language,
  defaultValue,
  scrollBeyondLastLine = false,
  ...options
}): JSX.Element => {
  const ref = useRef<monaco.editor.IStandaloneCodeEditor>();

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

  const handleEditorDidMount = (editor: monaco.editor.IStandaloneCodeEditor) => {
    ref.current = editor;
  };

  return (
    <div className="msla-monaco-container" style={{ height: height ?? 380, width }}>
      <Editor
        className="msla-monaco"
        options={{ ...options, minimap: { enabled: minimapEnabled }, scrollBeyondLastLine: scrollBeyondLastLine }}
        value={value}
        defaultValue={defaultValue}
        defaultLanguage={language ? language.toString() : undefined}
        theme={language === Constants.LANGUAGE_NAMES.WORKFLOW ? language : 'light'}
        onMount={handleEditorDidMount}
      />
    </div>
  );
};

export default CustomEditor;
