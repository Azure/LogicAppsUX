import Constants from '../../constants';
import { isHighContrastBlack } from '../../utils/theme';
import { registerWorkflowLanguageProviders } from '../../workflow/languageservice/workflowlanguageservice';
import Editor, { loader } from '@monaco-editor/react';
import type { IScrollEvent, editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useState, useEffect, forwardRef, useRef } from 'react';

export interface EditorContentChangedEventArgs extends editor.IModelContentChangedEvent {
  value?: string;
}
// TODO: Add more languages
export enum EditorLanguage {
  javascript = 'javascript',
  json = 'json',
  xml = 'xml',
  templateExpressionLanguage = 'TemplateExpressionLanguage',
  yaml = 'yaml',
}

export interface MonacoProps extends MonacoOptions {
  className?: string;
  defaultValue?: string;
  language?: EditorLanguage;
  value?: string;
  editorRef?: editor.IStandaloneCodeEditor;
  height?: string;
  width?: string;

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
  onMouseDown?(e: editor.IEditorMouseEvent): void;
}

export interface MonacoOptions {
  folding?: boolean;
  fontSize?: number;
  readOnly?: boolean;
  lineNumbers?: 'on' | 'off' | 'relative' | 'interval' | ((lineNumber: number) => string);
  lineNumbersMinChars?: number;
  lineHeight?: number;
  minimapEnabled?: boolean;
  scrollBeyondLastLine?: boolean;
  wordWrap?: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
  contextMenu?: boolean;
  scrollbar?: editor.IEditorScrollbarOptions;
  overviewRulerLanes?: number;
  overviewRulerBorder?: boolean;
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
      width,
      lineNumbersMinChars,
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
      onMouseDown,
      ...options
    },
    ref
  ) => {
    const [canRender, setCanRender] = useState(false);
    const currentRef = useRef<editor.IStandaloneCodeEditor>();

    const initTemplateLanguage = async () => {
      const { languages, editor } = await loader.init();
      if (!languages.getLanguages().some((lang: any) => lang.id === Constants.LANGUAGE_NAMES.WORKFLOW)) {
        registerWorkflowLanguageProviders(languages, editor);
      }
      setCanRender(true);
    };

    useEffect(() => {
      if (language === EditorLanguage.templateExpressionLanguage) {
        initTemplateLanguage();
      } else {
        setCanRender(true);
      }
    }, [language]);

    const handleContextMenu = (e: editor.IEditorMouseEvent) => {
      onContextMenu?.(e);
    };

    const handleDidBlurEditorText = (): void => {
      onBlurText?.();
    };

    const handleDidBlurEditorWidget = (): void => {
      onBlur?.();
    };

    const handleDidChangeConfiguration = (e: editor.ConfigurationChangedEvent): void => {
      onConfigurationChanged?.(e);
    };

    const handleDidChangeCursorPosition = (e: editor.ICursorPositionChangedEvent): void => {
      onCursorPositionChanged?.(e);
    };

    const handleDidChangeCursorSelection = (e: editor.ICursorSelectionChangedEvent): void => {
      onCursorSelectionChanged?.(e);
    };

    const handleDidChangeModel = (e: editor.IModelChangedEvent): void => {
      onChanged?.(e);
    };

    const handleDidChangeModelContent = (e: EditorContentChangedEventArgs, editor: editor.IStandaloneCodeEditor): void => {
      if (onContentChanged && editor) {
        const value = editor.getModel()?.getValue();
        onContentChanged({ ...e, value });
      }
    };

    const handleDidChangeModelDecorations = (e: editor.IModelDecorationsChangedEvent): void => {
      onDecorationsChanged?.(e);
    };

    const handleDidChangeModelLanguage = (e: editor.IModelLanguageChangedEvent): void => {
      onLanguageChanged?.(e);
    };

    const handleDidChangeModelOptions = (e: editor.IModelOptionsChangedEvent): void => {
      onOptionsChanged?.(e);
    };

    const handleDidFocusEditorText = (): void => {
      onFocusText?.();
    };

    const handleDidFocusEditorWidget = (): void => {
      onFocus?.();
    };

    const handleDisposed = (): void => {
      onDisposed?.();
    };

    const handleDidLayoutChange = (e: editor.EditorLayoutInfo): void => {
      onLayoutChanged?.(e);
    };

    const handleDidScrollChange = (e: IScrollEvent): void => {
      onScrollChanged?.(e);
    };

    const handleMouseDown = (e: editor.IEditorMouseEvent): void => {
      onMouseDown?.(e);
    };

    const handleUpdate = () => {
      currentRef.current?.layout();
    };

    const handleEditorMounted = (editor: editor.IStandaloneCodeEditor) => {
      currentRef.current = editor;

      if (ref) {
        // eslint-disable-next-line no-param-reassign
        (ref as MutableRefObject<editor.IStandaloneCodeEditor | null>).current = editor;
      }

      if (!readOnly) {
        // editor.focus();
      }

      onEditorRef?.(editor);

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
      editor.onMouseDown(handleMouseDown);
      onEditorLoaded?.();
    };

    return (
      <div className="msla-monaco-container">
        {canRender ? (
          <Editor
            keepCurrentModel={true}
            className={className}
            options={{
              readOnly: readOnly,
              contextmenu: contextMenu,
              folding: folding,
              minimap: { enabled: minimapEnabled },
              scrollBeyondLastLine: scrollBeyondLastLine,
              lineNumbersMinChars: lineNumbersMinChars,
              ...options,
            }}
            value={value}
            defaultValue={defaultValue}
            defaultLanguage={language ? language.toString() : undefined}
            theme={language === EditorLanguage.templateExpressionLanguage ? language : isHighContrastBlack() ? 'vs-dark' : 'vs'}
            onMount={handleEditorMounted}
            onChange={handleUpdate}
            height={height}
            width={width}
          />
        ) : null}
      </div>
    );
  }
);
MonacoEditor.displayName = 'MonacoEditor';

export default MonacoEditor;
