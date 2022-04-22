import Constants from '../../common/constants';
import {
  createCompletionItemProviderForFunctions,
  createCompletionItemProviderForValues,
  createSignatureHelpProvider,
  createLanguageDefinition,
  getTemplateFunctions,
} from '../../common/workflow/languageservice/workflowlanguageservice';
import { map } from '@microsoft-logic-apps/utils';
import Editor, { loader } from '@monaco-editor/react';
import { useEffect } from 'react';

// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
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
    height = '100%',
    width = '100%',
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
      if (!monaco.languages.getLanguages().some(({ id }) => id === languageName)) {
        // Register a new language
        monaco.languages.register({ id: languageName });

        monaco.languages.registerCompletionItemProvider(languageName, createCompletionItemProviderForFunctions(templateFunctions));
        monaco.languages.registerCompletionItemProvider(languageName, createCompletionItemProviderForValues());
        monaco.languages.registerSignatureHelpProvider(languageName, createSignatureHelpProvider(map(templateFunctions, 'name')));
        // Register a tokens provider for the language
        monaco.languages.setMonarchTokensProvider(languageName, createLanguageDefinition(templateFunctions));
        monaco.languages.setLanguageConfiguration(languageName, {
          autoClosingPairs: [
            {
              open: '(',
              close: ')',
            },
            {
              open: '[',
              close: ']',
            },
            {
              open: `'`,
              close: `'`,
            },
          ],
        });
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
    />
  );
};

export default CustomEditor;
