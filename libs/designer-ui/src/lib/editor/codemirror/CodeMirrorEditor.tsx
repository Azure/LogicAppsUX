import { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers as lineNumbersExtension, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput, StreamLanguage } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { javascript } from '@codemirror/lang-javascript';
import { xml } from '@codemirror/lang-xml';
import { yaml } from '@codemirror/lang-yaml';
import { csharp } from '@codemirror/legacy-modes/mode/clike';
import { powerShell } from '@codemirror/legacy-modes/mode/powershell';
import { useTheme } from '@fluentui/react';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { createFluentTheme } from './themes/fluent';
import { createEventExtensions } from './extensions/events';
import { createKeybindingExtensions } from './extensions/keybindings';
import { workflow } from './languages';
import type { CodeMirrorEditorProps, CodeMirrorEditorRef } from './types';

const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

const getLanguageExtension = (language?: string) => {
  switch (language) {
    case EditorLanguage.javascript:
      return javascript();
    case EditorLanguage.json:
      return json();
    case EditorLanguage.xml:
      return xml();
    case EditorLanguage.yaml:
      return yaml();
    case EditorLanguage.csharp:
      return StreamLanguage.define(csharp);
    case EditorLanguage.powershell:
      return StreamLanguage.define(powerShell);
    case EditorLanguage.python:
      return python();
    case EditorLanguage.templateExpressionLanguage:
      return workflow();
    default:
      return [];
  }
};

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  (
    {
      className,
      defaultValue = '',
      value,
      language,
      height,
      width,
      label,
      readOnly = false,
      lineNumbers = 'on',
      wordWrap = 'off',
      folding = false,
      fontSize = 14,
      monacoContainerStyle,
      onBlur,
      onBlurText,
      onFocus,
      onFocusText,
      onContentChanged,
      onCursorPositionChanged,
      onScrollChanged,
      onEditorLoaded,
      onEditorRef,
      onMouseDown,
      openTokenPicker,
    },
    ref
  ) => {
    const { isInverted } = useTheme();
    const containerRef = useRef<HTMLDivElement>(null);
    const viewRef = useRef<EditorView | null>(null);
    const isInitializedRef = useRef(false);

    // Create ref methods
    const editorRef = useMemo<CodeMirrorEditorRef>(
      () => ({
        getValue: () => viewRef.current?.state.doc.toString() ?? '',
        getModel: () => (viewRef.current ? { getValue: () => viewRef.current!.state.doc.toString() } : null),
        setValue: (text: string) => {
          if (viewRef.current) {
            viewRef.current.dispatch({
              changes: { from: 0, to: viewRef.current.state.doc.length, insert: text },
            });
          }
        },
        getSelection: () => viewRef.current?.state.selection.main ?? null,
        setSelection: (range) => {
          if (viewRef.current) {
            const doc = viewRef.current.state.doc;
            const startPos = doc.line(range.startLineNumber).from + range.startColumn - 1;
            const endPos = doc.line(range.endLineNumber).from + range.endColumn - 1;
            viewRef.current.dispatch({
              selection: { anchor: startPos, head: endPos },
            });
          }
        },
        getPosition: () => {
          if (!viewRef.current) {
            return null;
          }
          const pos = viewRef.current.state.selection.main.head;
          const line = viewRef.current.state.doc.lineAt(pos);
          return { lineNumber: line.number, column: pos - line.from + 1 };
        },
        executeEdits: (_source, edits) => {
          if (viewRef.current) {
            const changes = edits.map((edit) => {
              const doc = viewRef.current!.state.doc;
              const from = doc.line(edit.range.startLineNumber).from + edit.range.startColumn - 1;
              const to = doc.line(edit.range.endLineNumber).from + edit.range.endColumn - 1;
              return { from, to, insert: edit.text };
            });
            viewRef.current.dispatch({ changes });
          }
        },
        focus: () => viewRef.current?.focus(),
        layout: () => {
          // CodeMirror handles layout automatically
        },
        getView: () => viewRef.current,
      }),
      []
    );

    useImperativeHandle(ref, () => editorRef, [editorRef]);

    // Initialize editor
    useEffect(() => {
      if (!containerRef.current || isInitializedRef.current) {
        return;
      }
      isInitializedRef.current = true;

      const extensions = [
        history(),
        bracketMatching(),
        indentOnInput(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        themeCompartment.of(createFluentTheme(isInverted)),
        languageCompartment.of(getLanguageExtension(language)),
        readOnlyCompartment.of(EditorState.readOnly.of(readOnly)),
        ...createEventExtensions({
          onFocus,
          onFocusText,
          onBlur,
          onBlurText,
          onContentChanged,
          onCursorPositionChanged,
          onScrollChanged,
          onMouseDown,
        }),
        ...createKeybindingExtensions({ openTokenPicker }),
        EditorView.theme({
          '&': {
            fontSize: `${fontSize}px`,
            height: '100%',
            minHeight: '100px',
            border: `1px solid ${isInverted ? '#605e5c' : '#8a8886'}`,
            borderRadius: '2px',
            boxSizing: 'border-box',
          },
          '&.cm-focused': {
            outline: 'none',
            borderColor: '#0078d4',
          },
          '.cm-scroller': {
            overflow: 'auto',
            fontFamily: '"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontWeight: '500',
            letterSpacing: '0.5px',
            lineHeight: '1.4',
          },
          '.cm-content': {
            textAlign: 'left',
            padding: '4px 0',
            fontVariantLigatures: 'none',
          },
          '.cm-line': {
            padding: '0 4px',
          },
          '.cm-gutterElement': {
            fontFamily: '"SF Mono", Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
            fontWeight: '500',
          },
          '.cm-gutters': {
            borderRight: `1px solid ${isInverted ? '#3b3a39' : '#e1e1e1'}`,
            backgroundColor: isInverted ? '#252423' : '#f3f3f3',
          },
        }),
      ];

      if (lineNumbers === 'on') {
        extensions.push(lineNumbersExtension());
      }

      if (folding) {
        extensions.push(foldGutter());
      }

      if (wordWrap === 'on' || wordWrap === 'bounded') {
        extensions.push(EditorView.lineWrapping);
      }

      const state = EditorState.create({
        doc: value ?? defaultValue,
        extensions,
      });

      const view = new EditorView({
        state,
        parent: containerRef.current,
      });

      viewRef.current = view;
      onEditorRef?.(editorRef);
      onEditorLoaded?.();

      return () => {
        view.destroy();
        viewRef.current = null;
        isInitializedRef.current = false;
      };
    }, []); // Only run once on mount

    // Update theme when inverted changes
    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: themeCompartment.reconfigure(createFluentTheme(isInverted)),
        });
      }
    }, [isInverted]);

    // Update language when it changes
    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: languageCompartment.reconfigure(getLanguageExtension(language)),
        });
      }
    }, [language]);

    // Update readOnly when it changes
    useEffect(() => {
      if (viewRef.current) {
        viewRef.current.dispatch({
          effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(readOnly)),
        });
      }
    }, [readOnly]);

    // Update value when controlled value changes
    useEffect(() => {
      if (value !== undefined && viewRef.current) {
        const currentValue = viewRef.current.state.doc.toString();
        if (value !== currentValue) {
          viewRef.current.dispatch({
            changes: { from: 0, to: viewRef.current.state.doc.length, insert: value },
          });
        }
      }
    }, [value]);

    const containerStyle: React.CSSProperties = {
      height: height ?? '100%',
      width: width ?? '100%',
      ...monacoContainerStyle,
    };

    return (
      <div
        ref={containerRef}
        className={className}
        style={containerStyle}
        aria-label={label}
        data-automation-id={`codemirror-editor-${label}`}
      />
    );
  }
);

CodeMirrorEditor.displayName = 'CodeMirrorEditor';
