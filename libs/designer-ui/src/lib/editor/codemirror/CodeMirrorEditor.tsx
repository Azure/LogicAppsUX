import { forwardRef, useEffect, useImperativeHandle, useRef, useMemo } from 'react';
import { EditorState, Compartment } from '@codemirror/state';
import { EditorView, lineNumbers as lineNumbersExtension, highlightActiveLine, highlightActiveLineGutter } from '@codemirror/view';
import { history } from '@codemirror/commands';
import { bracketMatching, foldGutter, indentOnInput } from '@codemirror/language';
import { json } from '@codemirror/lang-json';
import { python } from '@codemirror/lang-python';
import { useTheme } from '@fluentui/react';
import { EditorLanguage } from '@microsoft/logic-apps-shared';
import { createFluentTheme } from './themes/fluent';
import { createEventExtensions } from './extensions/events';
import { createKeybindingExtensions } from './extensions/keybindings';
import type { CodeMirrorEditorProps, CodeMirrorEditorRef } from './types';

const themeCompartment = new Compartment();
const languageCompartment = new Compartment();
const readOnlyCompartment = new Compartment();

const getLanguageExtension = (language?: string) => {
  switch (language) {
    case EditorLanguage.json:
      return json();
    case EditorLanguage.python:
      return python();
    case EditorLanguage.templateExpressionLanguage:
      // TODO: Add workflow language support in Task 8-11
      return [];
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
      wordWrap = 'on',
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
          },
          '.cm-scroller': {
            overflow: 'auto',
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
