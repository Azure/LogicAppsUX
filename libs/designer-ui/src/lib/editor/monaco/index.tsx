import Constants from '../../constants';
import { isHighContrastBlack } from '../../utils/theme';
import { registerWorkflowLanguageProviders } from '../../workflow/languageservice/workflowlanguageservice';
import Editor, { loader } from '@monaco-editor/react';
import type { IScrollEvent, editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useEffect, forwardRef, useRef } from 'react';

export interface EditorContentChangedEventArgs extends editor.IModelContentChangedEvent {
  value?: string;
}
// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
  templateExpressionLanguage = 'TemplateExpressionLanguage',
}

export interface MonacoProps extends MonacoOptions {
  className?: string;
  defaultValue?: string;
  language?: EditorLanguage;
  value?: string;
  editorRef?: editor.IStandaloneCodeEditor;
  height?: string;

  onBlur?(): void;
  onBlurText?(): void;
  onChanged?(e: editor.IModelChangedEvent): void;
  onConfigurationChanged?(e: editor.ConfigurationChangedEvent): void;
  onContentChanged?(e: EditorContentChangedEventArgs): void;
  onContextMenu?(e: editor.IEditorMouseEvent): void;
  onCursorPositionChanged?(e: editor.ICursorPositionChangedEvent): void;
  onCursorSelectionChanged?(e: editor.ICursorSelectionChangedEvent): void;
  onEditorLoaded?(): void;
  onDecorationsChanged?(e: editor.IModelDecorationsChangedEvent): void;
  onDisposed?(): void;
  onFocus?(): void;
  onFocusText?(): void;
  onLanguageChanged?(e: editor.IModelLanguageChangedEvent): void;
  onLayoutChanged?(e: editor.EditorLayoutInfo): void;
  onOptionsChanged?(e: editor.IModelOptionsChangedEvent): void;
  onScrollChanged?(e: IScrollEvent): void;
  onEditorRef?(editor: editor.IStandaloneCodeEditor | undefined): void;
}

export interface MonacoOptions {
  folding?: boolean;
  fontSize?: number;
  readOnly?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  lineHeight?: number;
  minimapEnabled?: boolean;
  scrollBeyondLastLine?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  contextMenu?: boolean;
}

export const MonacoEditor = forwardRef<editor.IStandaloneCodeEditor, MonacoProps>(
  (
    {
      className = 'msla-monaco',
      contextMenu = false,
      defaultValue = '',
      readOnly = false,
      folding = false,
      language,
      minimapEnabled = false,
      value,
      scrollBeyondLastLine = false,
      height,
      onBlur,
      onBlurText,
      onChanged,
      onConfigurationChanged,
      onContentChanged,
      onContextMenu,
      onCursorPositionChanged,
      onCursorSelectionChanged,
      onEditorLoaded,
      onDecorationsChanged,
      onDisposed,
      onFocus,
      onFocusText,
      onLanguageChanged,
      onLayoutChanged,
      onOptionsChanged,
      onScrollChanged,
      onEditorRef,
      ...options
    },
    ref
  ) => {
    const currentRef = useRef<editor.IStandaloneCodeEditor>();

    const initWorkflowLanguage = async () => {
      const { languages, editor } = await loader.init();
      if (!languages.getLanguages().some((lang: any) => lang.id === Constants.LANGUAGE_NAMES.WORKFLOW)) {
        registerWorkflowLanguageProviders(languages, editor);
      }
    };

    useEffect(() => {
      if (language === Constants.LANGUAGE_NAMES.WORKFLOW) {
        initWorkflowLanguage();
      }
    }, [language]);

    const handleContextMenu = (e: editor.IEditorMouseEvent) => {
      if (onContextMenu) {
        onContextMenu(e);
      }
    };

    const handleDidBlurEditorText = (): void => {
      if (onBlurText) {
        onBlurText();
      }
    };

    const handleDidBlurEditorWidget = (): void => {
      if (onBlur) {
        onBlur();
      }
    };

    const handleDidChangeConfiguration = (e: editor.ConfigurationChangedEvent): void => {
      if (onConfigurationChanged) {
        onConfigurationChanged(e);
      }
    };

    const handleDidChangeCursorPosition = (e: editor.ICursorPositionChangedEvent): void => {
      if (onCursorPositionChanged) {
        onCursorPositionChanged(e);
      }
    };

    const handleDidChangeCursorSelection = (e: editor.ICursorSelectionChangedEvent): void => {
      if (onCursorSelectionChanged) {
        onCursorSelectionChanged(e);
      }
    };

    const handleDidChangeModel = (e: editor.IModelChangedEvent): void => {
      if (onChanged) {
        onChanged(e);
      }
    };

    const handleDidChangeModelContent = (e: EditorContentChangedEventArgs, editor: editor.IStandaloneCodeEditor): void => {
      if (onContentChanged && editor) {
        const value = editor.getModel()?.getValue();
        onContentChanged({ ...e, value });
      }
    };

    const handleDidChangeModelDecorations = (e: editor.IModelDecorationsChangedEvent): void => {
      if (onDecorationsChanged) {
        onDecorationsChanged(e);
      }
    };

    const handleDidChangeModelLanguage = (e: editor.IModelLanguageChangedEvent): void => {
      if (onLanguageChanged) {
        onLanguageChanged(e);
      }
    };

    const handleDidChangeModelOptions = (e: editor.IModelOptionsChangedEvent): void => {
      if (onOptionsChanged) {
        onOptionsChanged(e);
      }
    };

    const handleDidFocusEditorText = (): void => {
      if (onFocusText) {
        onFocusText();
      }
    };

    const handleDidFocusEditorWidget = (): void => {
      if (onFocus) {
        onFocus();
      }
    };

    const handleDisposed = (): void => {
      if (onDisposed) {
        onDisposed();
      }
    };

    const handleDidLayoutChange = (e: editor.EditorLayoutInfo): void => {
      if (onLayoutChanged) {
        onLayoutChanged(e);
      }
    };

    const handleDidScrollChange = (e: IScrollEvent): void => {
      if (onScrollChanged) {
        onScrollChanged(e);
      }
    };

    const handleEditorMounted = (editor: editor.IStandaloneCodeEditor) => {
      currentRef.current = editor;

      if (ref) {
        // eslint-disable-next-line no-param-reassign
        (ref as MutableRefObject<editor.IStandaloneCodeEditor | null>).current = editor;
      }

      if (!readOnly) {
        editor.focus();
      }

      if (onEditorRef) {
        onEditorRef(editor);
      }
      editor.onContextMenu(handleContextMenu);
      editor.onDidBlurEditorText(handleDidBlurEditorText);
      editor.onDidBlurEditorWidget(handleDidBlurEditorWidget);
      editor.onDidChangeConfiguration(handleDidChangeConfiguration);
      editor.onDidChangeCursorPosition(handleDidChangeCursorPosition);
      editor.onDidChangeCursorSelection(handleDidChangeCursorSelection);
      editor.onDidChangeModel(handleDidChangeModel);
      editor.onDidChangeModelContent((e) => handleDidChangeModelContent(e, editor));
      editor.onDidChangeModelDecorations(handleDidChangeModelDecorations);
      editor.onDidChangeModelLanguage(handleDidChangeModelLanguage);
      editor.onDidChangeModelOptions(handleDidChangeModelOptions);
      editor.onDidDispose(handleDisposed);
      editor.onDidFocusEditorText(handleDidFocusEditorText);
      editor.onDidFocusEditorWidget(handleDidFocusEditorWidget);
      editor.onDidLayoutChange(handleDidLayoutChange);
      editor.onDidScrollChange(handleDidScrollChange);
      if (onEditorLoaded) {
        onEditorLoaded();
      }
    };

    return (
      <div className="msla-monaco-container">
        <Editor
          className={className}
          options={{
            contextmenu: contextMenu,
            folding: folding,
            minimap: { enabled: minimapEnabled },
            scrollBeyondLastLine: scrollBeyondLastLine,
            ...options,
          }}
          value={value}
          defaultValue={defaultValue}
          defaultLanguage={language ? language.toString() : undefined}
          theme={language === Constants.LANGUAGE_NAMES.WORKFLOW ? language : isHighContrastBlack() ? 'vs-dark' : 'vs'}
          onMount={handleEditorMounted}
          height={height}
        />
      </div>
    );
  }
);
MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
