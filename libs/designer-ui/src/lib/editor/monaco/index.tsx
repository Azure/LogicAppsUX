import Constants from '../../constants';
import { registerWorkflowLanguageProviders } from '../../workflow/languageservice/workflowlanguageservice';
import { useTheme } from '@fluentui/react';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import Editor, { loader } from '@monaco-editor/react';
import * as monaco from 'monaco-editor';
import type { IScrollEvent, editor } from 'monaco-editor';
import type { MutableRefObject } from 'react';
import { useState, useEffect, forwardRef, useRef, useCallback } from 'react';
import { useMonacoStyles } from './monaco.styles';

loader.config({ monaco });

export interface EditorContentChangedEventArgs extends editor.IModelContentChangedEvent {
  value?: string;
}

export interface MonacoProps extends MonacoOptions {
  className?: string;
  defaultValue?: string;
  language?: EditorLanguage;
  value?: string;
  editorRef?: editor.IStandaloneCodeEditor;
  height?: string;
  width?: string;
  monacoContainerStyle?: React.CSSProperties;
  label?: string;
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
  openTokenPicker?(): void;
}

type SupportedEditorOptions = Pick<
  editor.IEditorOptions,
  | 'folding'
  | 'fontSize'
  | 'readOnly'
  | 'lineNumbers'
  | 'lineNumbersMinChars'
  | 'lineHeight'
  | 'scrollBeyondLastLine'
  | 'wordWrap'
  | 'wordWrapColumn'
  | 'scrollbar'
  | 'overviewRulerLanes'
  | 'overviewRulerBorder'
  | 'wrappingIndent'
  | 'automaticLayout'
> &
  Pick<editor.IGlobalEditorOptions, 'tabSize' | 'insertSpaces'>;

export type MonacoOptions = SupportedEditorOptions & {
  minimapEnabled?: boolean;
  contextMenu?: boolean;
};

export const MonacoEditor = forwardRef<editor.IStandaloneCodeEditor, MonacoProps>(
  (
    {
      className,
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
      openTokenPicker,
      label,
      wordWrap = 'on',
      ...options
    },
    ref
  ) => {
    const { isInverted } = useTheme();
    const styles = useMonacoStyles();
    const [canRender, setCanRender] = useState(false);
    const currentRef = useRef<editor.IStandaloneCodeEditor>();

    const initTemplateLanguage = useCallback(async () => {
      const { languages, editor } = await loader.init();
      if (!languages.getLanguages().some((lang: any) => lang.id === Constants.LANGUAGE_NAMES.WORKFLOW)) {
        registerWorkflowLanguageProviders(languages, editor, { isInverted, isIndentationEnabled: true });
      }
      setCanRender(true);
    }, [isInverted]);

    useEffect(() => {
      if (language === EditorLanguage.templateExpressionLanguage) {
        initTemplateLanguage();
      } else {
        setCanRender(true);
      }
    }, [initTemplateLanguage, language]);

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

    const openTokenPickerAction: editor.IActionDescriptor = {
      id: 'open-tokenpicker',
      label: 'Open TokenPicker',
      keybindings: [monaco.KeyMod.Alt | monaco.KeyCode.Slash],
      run: (): void | Promise<void> => {
        openTokenPicker?.();
      },
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
      editor.addAction(openTokenPickerAction);
      onEditorLoaded?.();
    };

    return (
      <div className={styles.container} style={options.monacoContainerStyle} data-automation-id={`monaco-editor-${label}`}>
        {canRender ? (
          <Editor
            keepCurrentModel={true}
            className={className || styles.root}
            options={{
              bracketPairColorization: {
                enabled: true,
                independentColorPoolPerBracketType: true,
              },
              readOnly: readOnly,
              contextmenu: contextMenu,
              folding: folding,
              minimap: { enabled: minimapEnabled },
              scrollBeyondLastLine: scrollBeyondLastLine,
              lineNumbersMinChars: lineNumbersMinChars,
              unicodeHighlight: {
                invisibleCharacters: false,
                nonBasicASCII: false,
                ambiguousCharacters: false,
              },
              renderWhitespace: 'none',
              ariaLabel: label,
              wordWrap,
              language,
              ...options,
            }}
            value={value}
            defaultValue={defaultValue}
            defaultLanguage={language ? language.toString() : undefined}
            theme={isInverted ? 'vs-dark' : 'vs'}
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
