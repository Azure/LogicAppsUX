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
import { useEffect } from 'react';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
  templateExpressionLanguage = 'TemplateExpressionLanguage',
}

export interface EditorProps {
  defaultValue?: string;
  folding?: boolean;
  height?: number | string;
  language?: EditorLanguage;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  minimapEnabled?: boolean;
  readOnly?: boolean;
  width?: number | string;
  value?: string;
}

export const CustomEditor: React.FC<EditorProps> = (props) => {
  const {
    folding = true,
    height = '100vh',
    width = '100vw',
    lineNumbers = 'on',
    minimapEnabled = true,
    readOnly = false,
    value,
    language,
    defaultValue,
  } = props;

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

  return (
    <Editor
      height={height}
      width={width}
      options={{ folding, lineNumbers, minimap: { enabled: minimapEnabled }, readOnly }}
      value={value}
      defaultValue={defaultValue}
      defaultLanguage={language ? language.toString() : undefined}
      theme={language === Constants.LANGUAGE_NAMES.WORKFLOW ? language : 'light'}
    />
  );
};

export default CustomEditor;
