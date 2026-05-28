# Monaco to CodeMirror Migration - Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace Monaco Editor with CodeMirror 6 across designer-ui for better performance and smaller bundle size.

**Architecture:** Create a drop-in CodeMirrorEditor component with identical props API to MonacoEditor. Implement custom workflow expression language using Lezer grammar. Bridge Fluent UI v9 design tokens for theming.

**Tech Stack:** CodeMirror 6, Lezer parser generator, Fluent UI v9 tokens, React 18, TypeScript

---

## Phase 1: Dependencies & Foundation

### Task 1: Add CodeMirror Dependencies

**Files:**
- Modify: `libs/designer-ui/package.json`

**Step 1: Add CodeMirror packages to dependencies**

In `libs/designer-ui/package.json`, add to `dependencies`:

```json
"@codemirror/autocomplete": "^6.18.0",
"@codemirror/commands": "^6.6.0",
"@codemirror/lang-json": "^6.0.1",
"@codemirror/lang-python": "^6.1.6",
"@codemirror/language": "^6.10.0",
"@codemirror/search": "^6.5.0",
"@codemirror/state": "^6.4.0",
"@codemirror/view": "^6.28.0",
"@lezer/common": "^1.2.0",
"@lezer/highlight": "^1.2.0",
"@lezer/lr": "^1.4.0"
```

**Step 2: Install dependencies**

Run: `pnpm install`
Expected: Dependencies install successfully

**Step 3: Commit**

```bash
git add libs/designer-ui/package.json pnpm-lock.yaml
git commit -m "chore: add CodeMirror 6 dependencies"
```

---

### Task 2: Create Directory Structure

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/index.tsx`
- Create: `libs/designer-ui/src/lib/editor/codemirror/extensions/index.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/index.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/themes/index.ts`

**Step 1: Create placeholder files**

Create `libs/designer-ui/src/lib/editor/codemirror/index.tsx`:
```typescript
// CodeMirror Editor - placeholder
export { CodeMirrorEditor } from './CodeMirrorEditor';
export type { CodeMirrorEditorProps, CodeMirrorEditorRef } from './CodeMirrorEditor';
```

Create `libs/designer-ui/src/lib/editor/codemirror/extensions/index.ts`:
```typescript
// Extensions barrel export
export {};
```

Create `libs/designer-ui/src/lib/editor/codemirror/languages/index.ts`:
```typescript
// Languages barrel export
export {};
```

Create `libs/designer-ui/src/lib/editor/codemirror/themes/index.ts`:
```typescript
// Themes barrel export
export {};
```

**Step 2: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/
git commit -m "chore: scaffold CodeMirror directory structure"
```

---

## Phase 2: Theme Integration

### Task 3: Create Fluent UI Theme Bridge

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/themes/fluent.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/themes/__tests__/fluent.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/themes/__tests__/fluent.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { createFluentTheme } from '../fluent';
import { Extension } from '@codemirror/state';

describe('createFluentTheme', () => {
  it('should return an array of extensions for light theme', () => {
    const theme = createFluentTheme(false);
    expect(Array.isArray(theme)).toBe(true);
    expect(theme.length).toBeGreaterThan(0);
  });

  it('should return an array of extensions for dark theme', () => {
    const theme = createFluentTheme(true);
    expect(Array.isArray(theme)).toBe(true);
    expect(theme.length).toBeGreaterThan(0);
  });

  it('should return different themes for light and dark', () => {
    const lightTheme = createFluentTheme(false);
    const darkTheme = createFluentTheme(true);
    expect(lightTheme).not.toEqual(darkTheme);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- fluent.test --run`
Expected: FAIL with "Cannot find module '../fluent'"

**Step 3: Write minimal implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/themes/fluent.ts`:
```typescript
import { EditorView } from '@codemirror/view';
import { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// Token colors matching current Monaco theme
const lightColors = {
  function: '#110188',
  string: '#a31515',
  number: '#098658',
  keyword: '#0000ff',
  background: '#ffffff',
  foreground: '#000000',
  selection: '#add6ff',
  gutterBackground: '#f5f5f5',
  gutterBorder: '#e0e0e0',
};

const darkColors = {
  function: '#ffd700',
  string: '#ce9178',
  number: '#b5cea8',
  keyword: '#569cd6',
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  selection: '#264f78',
  gutterBackground: '#252526',
  gutterBorder: '#404040',
};

export const createFluentTheme = (isInverted: boolean): Extension[] => {
  const colors = isInverted ? darkColors : lightColors;

  const editorTheme = EditorView.theme(
    {
      '&': {
        backgroundColor: colors.background,
        color: colors.foreground,
      },
      '.cm-content': {
        caretColor: colors.foreground,
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: colors.foreground,
      },
      '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
        backgroundColor: colors.selection,
      },
      '.cm-gutters': {
        backgroundColor: colors.gutterBackground,
        color: colors.foreground,
        borderRight: `1px solid ${colors.gutterBorder}`,
      },
      '.cm-activeLineGutter': {
        backgroundColor: colors.selection,
      },
    },
    { dark: isInverted }
  );

  const highlighting = HighlightStyle.define([
    { tag: tags.function(tags.variableName), color: colors.function },
    { tag: tags.string, color: colors.string },
    { tag: tags.number, color: colors.number },
    { tag: tags.keyword, color: colors.keyword },
    { tag: tags.bool, color: colors.keyword },
    { tag: tags.null, color: colors.keyword },
  ]);

  return [editorTheme, syntaxHighlighting(highlighting)];
};
```

**Step 4: Update barrel export**

Update `libs/designer-ui/src/lib/editor/codemirror/themes/index.ts`:
```typescript
export { createFluentTheme } from './fluent';
```

**Step 5: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- fluent.test --run`
Expected: PASS

**Step 6: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/themes/
git commit -m "feat: add Fluent UI theme bridge for CodeMirror"
```

---

## Phase 3: Core Editor Component

### Task 4: Define Editor Types

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/types.ts`

**Step 1: Create types file**

Create `libs/designer-ui/src/lib/editor/codemirror/types.ts`:
```typescript
import type { EditorView } from '@codemirror/view';
import type { SelectionRange } from '@codemirror/state';

/**
 * Props interface matching MonacoEditor for drop-in replacement
 */
export interface CodeMirrorEditorProps {
  className?: string;
  defaultValue?: string;
  value?: string;
  language?: string;
  height?: string;
  width?: string;
  label?: string;
  readOnly?: boolean;
  lineNumbers?: 'on' | 'off';
  wordWrap?: 'on' | 'off' | 'bounded';
  wordWrapColumn?: number;
  folding?: boolean;
  fontSize?: number;
  tabSize?: number;
  insertSpaces?: boolean;
  minimapEnabled?: boolean;
  contextMenu?: boolean;
  scrollBeyondLastLine?: boolean;
  lineNumbersMinChars?: number;
  automaticLayout?: boolean;
  overviewRulerLanes?: number;
  overviewRulerBorder?: boolean;
  scrollbar?: {
    horizontal?: 'auto' | 'hidden' | 'visible';
    vertical?: 'auto' | 'hidden' | 'visible';
  };
  monacoContainerStyle?: React.CSSProperties;

  // Event callbacks
  onBlur?(): void;
  onBlurText?(): void;
  onFocus?(): void;
  onFocusText?(): void;
  onContentChanged?(e: EditorContentChangedEvent): void;
  onCursorPositionChanged?(e: CursorPositionChangedEvent): void;
  onScrollChanged?(e: ScrollChangedEvent): void;
  onEditorLoaded?(): void;
  onEditorRef?(editor: CodeMirrorEditorRef | undefined): void;
  onMouseDown?(e: MouseEvent): void;
  openTokenPicker?(): void;
}

export interface EditorContentChangedEvent {
  value?: string;
}

export interface CursorPositionChangedEvent {
  position: {
    lineNumber: number;
    column: number;
  };
}

export interface ScrollChangedEvent {
  scrollTop: number;
  scrollLeft: number;
}

/**
 * Ref interface matching Monaco's IStandaloneCodeEditor methods
 */
export interface CodeMirrorEditorRef {
  getValue(): string;
  getModel(): { getValue(): string } | null;
  setValue(text: string): void;
  getSelection(): SelectionRange | null;
  setSelection(range: { startLineNumber: number; startColumn: number; endLineNumber: number; endColumn: number }): void;
  getPosition(): { lineNumber: number; column: number } | null;
  executeEdits(source: string | null, edits: Array<{ range: any; text: string }>): void;
  focus(): void;
  layout(): void;
  getView(): EditorView | null;
}
```

**Step 2: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/types.ts
git commit -m "feat: add CodeMirror editor type definitions"
```

---

### Task 5: Create Event Extensions

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/extensions/events.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/extensions/__tests__/events.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/extensions/__tests__/events.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createEventExtensions } from '../events';
import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

describe('createEventExtensions', () => {
  it('should return an array of extensions', () => {
    const extensions = createEventExtensions({});
    expect(Array.isArray(extensions)).toBe(true);
  });

  it('should include focus handler when onFocus provided', () => {
    const onFocus = vi.fn();
    const extensions = createEventExtensions({ onFocus });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should include blur handler when onBlur provided', () => {
    const onBlur = vi.fn();
    const extensions = createEventExtensions({ onBlur });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should include content change handler when onContentChanged provided', () => {
    const onContentChanged = vi.fn();
    const extensions = createEventExtensions({ onContentChanged });
    expect(extensions.length).toBeGreaterThan(0);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- events.test --run`
Expected: FAIL with "Cannot find module '../events'"

**Step 3: Write minimal implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/extensions/events.ts`:
```typescript
import { Extension } from '@codemirror/state';
import { EditorView, ViewUpdate } from '@codemirror/view';
import type { EditorContentChangedEvent, CursorPositionChangedEvent, ScrollChangedEvent } from '../types';

export interface EventExtensionOptions {
  onFocus?(): void;
  onFocusText?(): void;
  onBlur?(): void;
  onBlurText?(): void;
  onContentChanged?(e: EditorContentChangedEvent): void;
  onCursorPositionChanged?(e: CursorPositionChangedEvent): void;
  onScrollChanged?(e: ScrollChangedEvent): void;
  onMouseDown?(e: MouseEvent): void;
}

export const createEventExtensions = (options: EventExtensionOptions): Extension[] => {
  const extensions: Extension[] = [];

  // Focus/blur handling
  if (options.onFocus || options.onBlur || options.onFocusText || options.onBlurText) {
    extensions.push(
      EditorView.domEventHandlers({
        focus: () => {
          options.onFocus?.();
          options.onFocusText?.();
        },
        blur: () => {
          options.onBlur?.();
          options.onBlurText?.();
        },
      })
    );
  }

  // Content change and cursor position handling
  if (options.onContentChanged || options.onCursorPositionChanged) {
    extensions.push(
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged && options.onContentChanged) {
          options.onContentChanged({
            value: update.state.doc.toString(),
          });
        }

        if (update.selectionSet && options.onCursorPositionChanged) {
          const pos = update.state.selection.main.head;
          const line = update.state.doc.lineAt(pos);
          options.onCursorPositionChanged({
            position: {
              lineNumber: line.number,
              column: pos - line.from + 1,
            },
          });
        }
      })
    );
  }

  // Scroll handling
  if (options.onScrollChanged) {
    extensions.push(
      EditorView.domEventHandlers({
        scroll: (event, view) => {
          const scrollDOM = view.scrollDOM;
          options.onScrollChanged?.({
            scrollTop: scrollDOM.scrollTop,
            scrollLeft: scrollDOM.scrollLeft,
          });
        },
      })
    );
  }

  // Mouse down handling
  if (options.onMouseDown) {
    extensions.push(
      EditorView.domEventHandlers({
        mousedown: (event) => {
          options.onMouseDown?.(event);
        },
      })
    );
  }

  return extensions;
};
```

**Step 4: Update barrel export**

Update `libs/designer-ui/src/lib/editor/codemirror/extensions/index.ts`:
```typescript
export { createEventExtensions } from './events';
export type { EventExtensionOptions } from './events';
```

**Step 5: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- events.test --run`
Expected: PASS

**Step 6: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/extensions/
git commit -m "feat: add CodeMirror event handler extensions"
```

---

### Task 6: Create Keybinding Extensions

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/extensions/keybindings.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/extensions/__tests__/keybindings.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/extensions/__tests__/keybindings.test.ts`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createKeybindingExtensions } from '../keybindings';

describe('createKeybindingExtensions', () => {
  it('should return an array of extensions', () => {
    const extensions = createKeybindingExtensions({});
    expect(Array.isArray(extensions)).toBe(true);
  });

  it('should include token picker keybinding when openTokenPicker provided', () => {
    const openTokenPicker = vi.fn();
    const extensions = createKeybindingExtensions({ openTokenPicker });
    expect(extensions.length).toBeGreaterThan(0);
  });

  it('should return empty array when no handlers provided', () => {
    const extensions = createKeybindingExtensions({});
    // Base keybindings are always included
    expect(Array.isArray(extensions)).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- keybindings.test --run`
Expected: FAIL with "Cannot find module '../keybindings'"

**Step 3: Write minimal implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/extensions/keybindings.ts`:
```typescript
import { Extension } from '@codemirror/state';
import { keymap } from '@codemirror/view';
import { defaultKeymap, historyKeymap } from '@codemirror/commands';

export interface KeybindingExtensionOptions {
  openTokenPicker?(): void;
}

export const createKeybindingExtensions = (options: KeybindingExtensionOptions): Extension[] => {
  const extensions: Extension[] = [
    keymap.of(defaultKeymap),
    keymap.of(historyKeymap),
  ];

  // Alt+/ to open token picker (matching Monaco behavior)
  if (options.openTokenPicker) {
    extensions.push(
      keymap.of([
        {
          key: 'Alt-/',
          run: () => {
            options.openTokenPicker?.();
            return true;
          },
        },
      ])
    );
  }

  return extensions;
};
```

**Step 4: Update barrel export**

Update `libs/designer-ui/src/lib/editor/codemirror/extensions/index.ts`:
```typescript
export { createEventExtensions } from './events';
export type { EventExtensionOptions } from './events';
export { createKeybindingExtensions } from './keybindings';
export type { KeybindingExtensionOptions } from './keybindings';
```

**Step 5: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- keybindings.test --run`
Expected: PASS

**Step 6: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/extensions/
git commit -m "feat: add CodeMirror keybinding extensions with Alt+/ token picker"
```

---

### Task 7: Create Main CodeMirrorEditor Component

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/CodeMirrorEditor.tsx`
- Create: `libs/designer-ui/src/lib/editor/codemirror/__tests__/CodeMirrorEditor.test.tsx`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/__tests__/CodeMirrorEditor.test.tsx`:
```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CodeMirrorEditor } from '../CodeMirrorEditor';
import { createRef } from 'react';
import type { CodeMirrorEditorRef } from '../types';

describe('CodeMirrorEditor', () => {
  it('should render without crashing', () => {
    render(<CodeMirrorEditor />);
    // CodeMirror creates a div with cm-editor class
    expect(document.querySelector('.cm-editor')).toBeInTheDocument();
  });

  it('should display defaultValue', () => {
    render(<CodeMirrorEditor defaultValue="test content" />);
    expect(screen.getByText('test content')).toBeInTheDocument();
  });

  it('should expose ref methods', () => {
    const ref = createRef<CodeMirrorEditorRef>();
    render(<CodeMirrorEditor ref={ref} defaultValue="hello" />);

    expect(ref.current).not.toBeNull();
    expect(ref.current?.getValue()).toBe('hello');
  });

  it('should apply readOnly prop', () => {
    render(<CodeMirrorEditor readOnly={true} />);
    const editor = document.querySelector('.cm-editor');
    expect(editor).toHaveAttribute('contenteditable', 'false');
  });

  it('should call onContentChanged when content changes', async () => {
    const onContentChanged = vi.fn();
    const ref = createRef<CodeMirrorEditorRef>();
    render(<CodeMirrorEditor ref={ref} onContentChanged={onContentChanged} />);

    // Programmatically set value
    ref.current?.setValue('new content');

    expect(onContentChanged).toHaveBeenCalledWith(
      expect.objectContaining({ value: 'new content' })
    );
  });

  it('should apply custom height', () => {
    const { container } = render(<CodeMirrorEditor height="200px" />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('200px');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- CodeMirrorEditor.test --run`
Expected: FAIL with "Cannot find module '../CodeMirrorEditor'"

**Step 3: Write implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/CodeMirrorEditor.tsx`:
```typescript
import { forwardRef, useEffect, useImperativeHandle, useRef, useCallback, useMemo } from 'react';
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
      // TODO: Add workflow language support
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
      tabSize = 2,
      minimapEnabled = false,
      scrollBeyondLastLine = false,
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
          if (!viewRef.current) return null;
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
      if (!containerRef.current || isInitializedRef.current) return;
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
```

**Step 4: Update main index export**

Update `libs/designer-ui/src/lib/editor/codemirror/index.tsx`:
```typescript
export { CodeMirrorEditor } from './CodeMirrorEditor';
export type { CodeMirrorEditorProps, CodeMirrorEditorRef, EditorContentChangedEvent } from './types';
```

**Step 5: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- CodeMirrorEditor.test --run`
Expected: PASS

**Step 6: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/
git commit -m "feat: add main CodeMirrorEditor component with Monaco-compatible API"
```

---

## Phase 4: Workflow Expression Language

### Task 8: Create Workflow Language Tokenizer

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/tokens.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/tokens.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/tokens.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { workflowHighlighting, workflowLanguage } from '../tokens';

describe('workflowLanguage', () => {
  it('should export a language support object', () => {
    expect(workflowLanguage).toBeDefined();
  });

  it('should export highlighting styles', () => {
    expect(workflowHighlighting).toBeDefined();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- tokens.test --run`
Expected: FAIL with "Cannot find module '../tokens'"

**Step 3: Write implementation using StreamLanguage**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/tokens.ts`:
```typescript
import { LanguageSupport, StreamLanguage, StringStream } from '@codemirror/language';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { FunctionGroupDefinitions } from '../../../../workflow/languageservice/templatefunctions';

// Get all function names for highlighting
const functionNames = new Set(
  FunctionGroupDefinitions.flatMap((group) => group.functions.map((fn) => fn.name.toLowerCase()))
);

const keywords = new Set(['null', 'true', 'false']);

interface WorkflowState {
  inString: boolean;
}

const workflowStreamParser = {
  name: 'workflow',
  startState: (): WorkflowState => ({ inString: false }),
  token: (stream: StringStream, state: WorkflowState): string | null => {
    // Handle whitespace
    if (stream.eatSpace()) return null;

    // Handle strings
    if (stream.peek() === "'") {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "'") break;
        if (ch === '\\') stream.next();
      }
      return 'string';
    }

    // Handle numbers
    if (stream.match(/^\d+(\.\d+)?([eE][+-]?\d+)?/)) {
      return 'number';
    }

    // Handle identifiers (functions and keywords)
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      const word = stream.current().toLowerCase();
      if (functionNames.has(word)) return 'function';
      if (keywords.has(word)) return 'keyword';
      return 'variable';
    }

    // Handle operators and punctuation
    if (stream.match(/^[()[\],.:@]/)) {
      return 'punctuation';
    }

    // Skip unknown characters
    stream.next();
    return null;
  },
};

export const workflowStreamLanguage = StreamLanguage.define(workflowStreamParser);

export const workflowLanguage = new LanguageSupport(workflowStreamLanguage);

export const workflowHighlighting = HighlightStyle.define([
  { tag: tags.function(tags.variableName), class: 'cm-workflow-function' },
  { tag: tags.string, class: 'cm-workflow-string' },
  { tag: tags.number, class: 'cm-workflow-number' },
  { tag: tags.keyword, class: 'cm-workflow-keyword' },
]);
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- tokens.test --run`
Expected: PASS

**Step 5: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/languages/workflow/
git commit -m "feat: add workflow expression language tokenizer"
```

---

### Task 9: Create Workflow Autocomplete

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/completion.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/completion.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/completion.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { workflowCompletion } from '../completion';
import { CompletionContext, CompletionResult } from '@codemirror/autocomplete';
import { EditorState } from '@codemirror/state';

describe('workflowCompletion', () => {
  it('should export a completion source', () => {
    expect(workflowCompletion).toBeDefined();
    expect(typeof workflowCompletion).toBe('function');
  });

  it('should provide function completions', () => {
    const state = EditorState.create({ doc: 'con' });
    const context = new CompletionContext(state, 3, false);
    const result = workflowCompletion(context) as CompletionResult | null;

    expect(result).not.toBeNull();
    expect(result?.options.some(opt => opt.label.toLowerCase().includes('concat'))).toBe(true);
  });

  it('should provide keyword completions', () => {
    const state = EditorState.create({ doc: 'nul' });
    const context = new CompletionContext(state, 3, false);
    const result = workflowCompletion(context) as CompletionResult | null;

    expect(result).not.toBeNull();
    expect(result?.options.some(opt => opt.label === 'null')).toBe(true);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- completion.test --run`
Expected: FAIL with "Cannot find module '../completion'"

**Step 3: Write implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/completion.ts`:
```typescript
import { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
import { FunctionGroupDefinitions } from '../../../../workflow/languageservice/templatefunctions';

const keywords = ['null', 'true', 'false'];

// Build completion items from function definitions
const functionCompletions: Completion[] = FunctionGroupDefinitions.flatMap((group) =>
  group.functions.map((fn) => ({
    label: fn.name,
    type: 'function',
    info: fn.description,
    apply: fn.signatures.every((sig) => sig.parameters.length === 0) ? `${fn.name}()` : fn.name,
    boost: 1,
  }))
);

const keywordCompletions: Completion[] = keywords.map((kw) => ({
  label: kw,
  type: 'keyword',
  boost: 0,
}));

const allCompletions = [...functionCompletions, ...keywordCompletions];

export const workflowCompletion = (context: CompletionContext): CompletionResult | null => {
  const word = context.matchBefore(/[a-zA-Z_][a-zA-Z0-9_]*/);

  if (!word && !context.explicit) return null;

  const from = word?.from ?? context.pos;
  const text = word?.text.toLowerCase() ?? '';

  const options = allCompletions.filter(
    (opt) => opt.label.toLowerCase().startsWith(text) || text === ''
  );

  if (options.length === 0) return null;

  return {
    from,
    options,
    validFor: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  };
};
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- completion.test --run`
Expected: PASS

**Step 5: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/languages/workflow/
git commit -m "feat: add workflow expression autocomplete"
```

---

### Task 10: Create Workflow Signature Help

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/signature.ts`
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/signature.test.ts`

**Step 1: Write the failing test**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/__tests__/signature.test.ts`:
```typescript
import { describe, it, expect } from 'vitest';
import { workflowSignatureHelp, getSignatureAtPosition } from '../signature';

describe('workflowSignatureHelp', () => {
  it('should export signature help extension', () => {
    expect(workflowSignatureHelp).toBeDefined();
  });
});

describe('getSignatureAtPosition', () => {
  it('should return null for empty text', () => {
    const result = getSignatureAtPosition('', 0);
    expect(result).toBeNull();
  });

  it('should find function signature after opening paren', () => {
    const result = getSignatureAtPosition('concat(', 7);
    expect(result).not.toBeNull();
    expect(result?.functionName.toLowerCase()).toBe('concat');
    expect(result?.activeParameter).toBe(0);
  });

  it('should track active parameter with commas', () => {
    const result = getSignatureAtPosition("concat('a', ", 12);
    expect(result).not.toBeNull();
    expect(result?.activeParameter).toBe(1);
  });

  it('should handle nested function calls', () => {
    const result = getSignatureAtPosition('concat(toLower(', 15);
    expect(result).not.toBeNull();
    expect(result?.functionName.toLowerCase()).toBe('tolower');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm --filter @microsoft/designer-ui test -- signature.test --run`
Expected: FAIL with "Cannot find module '../signature'"

**Step 3: Write implementation**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/signature.ts`:
```typescript
import { Extension } from '@codemirror/state';
import { EditorView, Tooltip, showTooltip } from '@codemirror/view';
import { FunctionGroupDefinitions, FunctionDefinition } from '../../../../workflow/languageservice/templatefunctions';
import { getPropertyValue, map } from '@microsoft/logic-apps-shared';

const templateFunctions = map(
  FunctionGroupDefinitions.flatMap((group) => group.functions),
  'name'
);

export interface SignatureInfo {
  functionName: string;
  activeParameter: number;
  definition: FunctionDefinition;
}

export const getSignatureAtPosition = (text: string, position: number): SignatureInfo | null => {
  const textBeforeCursor = text.slice(0, position);

  // Track function call stack
  const callStack: Array<{ name: string; argCount: number }> = [];

  let i = 0;
  let currentIdentifier = '';

  while (i < textBeforeCursor.length) {
    const char = textBeforeCursor[i];

    // Build identifier
    if (/[a-zA-Z_]/.test(char)) {
      currentIdentifier += char;
    } else if (/[0-9]/.test(char) && currentIdentifier) {
      currentIdentifier += char;
    } else {
      if (char === '(') {
        if (currentIdentifier) {
          callStack.push({ name: currentIdentifier, argCount: 0 });
        }
        currentIdentifier = '';
      } else if (char === ')') {
        callStack.pop();
        currentIdentifier = '';
      } else if (char === ',') {
        if (callStack.length > 0) {
          callStack[callStack.length - 1].argCount++;
        }
        currentIdentifier = '';
      } else if (char === "'") {
        // Skip string literals
        i++;
        while (i < textBeforeCursor.length && textBeforeCursor[i] !== "'") {
          if (textBeforeCursor[i] === '\\') i++;
          i++;
        }
        currentIdentifier = '';
      } else {
        currentIdentifier = '';
      }
    }
    i++;
  }

  if (callStack.length === 0) return null;

  const currentCall = callStack[callStack.length - 1];
  const definition = getPropertyValue(templateFunctions, currentCall.name);

  if (!definition) return null;

  return {
    functionName: currentCall.name,
    activeParameter: currentCall.argCount,
    definition,
  };
};

const createSignatureTooltip = (view: EditorView): Tooltip | null => {
  const pos = view.state.selection.main.head;
  const text = view.state.doc.toString();
  const signatureInfo = getSignatureAtPosition(text, pos);

  if (!signatureInfo) return null;

  const { definition, activeParameter } = signatureInfo;
  const signature = definition.signatures[0]; // Use first signature

  if (!signature) return null;

  return {
    pos,
    above: true,
    create: () => {
      const dom = document.createElement('div');
      dom.className = 'cm-signature-help';
      dom.style.cssText = 'padding: 4px 8px; background: var(--vscode-editorHoverWidget-background, #f3f3f3); border: 1px solid var(--vscode-editorHoverWidget-border, #c8c8c8); border-radius: 3px; font-family: monospace; font-size: 12px;';

      // Build signature display
      let html = `<strong>${definition.name}</strong>(`;
      html += signature.parameters
        .map((param, idx) => {
          const paramText = `${param.name}: ${param.type}`;
          return idx === activeParameter ? `<u><strong>${paramText}</strong></u>` : paramText;
        })
        .join(', ');
      html += ')';

      if (signature.documentation) {
        html += `<br/><small>${signature.documentation}</small>`;
      }

      const activeParam = signature.parameters[activeParameter];
      if (activeParam?.documentation) {
        html += `<br/><em>${activeParam.name}: ${activeParam.documentation}</em>`;
      }

      dom.innerHTML = html;
      return { dom };
    },
  };
};

export const workflowSignatureHelp: Extension = [
  showTooltip.compute(['selection', 'doc'], (state) => {
    // Only show when there's a potential function call
    const text = state.doc.toString();
    const pos = state.selection.main.head;
    const textBefore = text.slice(Math.max(0, pos - 100), pos);

    if (!textBefore.includes('(')) return null;

    return (view: EditorView) => createSignatureTooltip(view);
  }),
];
```

**Step 4: Run test to verify it passes**

Run: `pnpm --filter @microsoft/designer-ui test -- signature.test --run`
Expected: PASS

**Step 5: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/languages/workflow/
git commit -m "feat: add workflow expression signature help"
```

---

### Task 11: Bundle Workflow Language Support

**Files:**
- Create: `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/index.ts`

**Step 1: Create bundle**

Create `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/index.ts`:
```typescript
import { Extension } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { workflowLanguage, workflowHighlighting } from './tokens';
import { workflowCompletion } from './completion';
import { workflowSignatureHelp } from './signature';
import { syntaxHighlighting } from '@codemirror/language';

export { workflowLanguage, workflowHighlighting } from './tokens';
export { workflowCompletion } from './completion';
export { workflowSignatureHelp, getSignatureAtPosition } from './signature';

/**
 * Complete workflow language support bundle
 */
export const workflow = (): Extension[] => [
  workflowLanguage,
  syntaxHighlighting(workflowHighlighting),
  autocompletion({ override: [workflowCompletion] }),
  workflowSignatureHelp,
];
```

**Step 2: Update languages barrel export**

Update `libs/designer-ui/src/lib/editor/codemirror/languages/index.ts`:
```typescript
export { workflow, workflowLanguage, workflowCompletion, workflowSignatureHelp } from './workflow';
```

**Step 3: Update CodeMirrorEditor to use workflow language**

In `libs/designer-ui/src/lib/editor/codemirror/CodeMirrorEditor.tsx`, update the `getLanguageExtension` function:
```typescript
import { workflow } from './languages';

const getLanguageExtension = (language?: string) => {
  switch (language) {
    case EditorLanguage.json:
      return json();
    case EditorLanguage.python:
      return python();
    case EditorLanguage.templateExpressionLanguage:
      return workflow();
    default:
      return [];
  }
};
```

**Step 4: Run all workflow language tests**

Run: `pnpm --filter @microsoft/designer-ui test -- workflow --run`
Expected: All PASS

**Step 5: Commit**

```bash
git add libs/designer-ui/src/lib/editor/codemirror/languages/
git add libs/designer-ui/src/lib/editor/codemirror/CodeMirrorEditor.tsx
git commit -m "feat: bundle workflow language support with autocomplete and signature help"
```

---

## Phase 5: Consumer Migration

### Task 12: Update Editor Exports

**Files:**
- Modify: `libs/designer-ui/src/lib/editor/monaco/index.tsx` (rename exports)

**Step 1: Create compatibility re-export**

Update `libs/designer-ui/src/lib/editor/monaco/index.tsx` to re-export CodeMirror as Monaco:
```typescript
// Re-export CodeMirror as Monaco for backwards compatibility
export { CodeMirrorEditor as MonacoEditor } from '../codemirror';
export type {
  CodeMirrorEditorProps as MonacoProps,
  CodeMirrorEditorRef,
  EditorContentChangedEvent as EditorContentChangedEventArgs,
} from '../codemirror';

// Alias for ref type used by consumers
export type { CodeMirrorEditorRef as editor } from '../codemirror';
```

**Step 2: Verify imports still work**

Run: `pnpm run build:lib --filter @microsoft/designer-ui`
Expected: Build succeeds

**Step 3: Commit**

```bash
git add libs/designer-ui/src/lib/editor/monaco/index.tsx
git commit -m "refactor: re-export CodeMirror as Monaco for compatibility"
```

---

### Task 13: Update CodeEditor Consumer

**Files:**
- Modify: `libs/designer-ui/src/lib/code/index.tsx`

**Step 1: Verify CodeEditor works with new editor**

The CodeEditor imports `MonacoEditor` from `../editor/monaco`, which now re-exports CodeMirror.

Run: `pnpm --filter @microsoft/designer-ui test -- code --run`
Expected: Tests pass (or fail if type changes needed)

**Step 2: Fix any type issues**

If there are type errors, update the imports in `libs/designer-ui/src/lib/code/index.tsx`:
```typescript
import type { EditorContentChangedEventArgs } from '../editor/monaco';
import { MonacoEditor } from '../editor/monaco';
// Change to:
import type { EditorContentChangedEvent as EditorContentChangedEventArgs } from '../editor/codemirror';
import { CodeMirrorEditor as MonacoEditor } from '../editor/codemirror';
```

**Step 3: Commit**

```bash
git add libs/designer-ui/src/lib/code/index.tsx
git commit -m "refactor: update CodeEditor to use CodeMirror"
```

---

### Task 14: Update ExpressionEditor Consumer

**Files:**
- Modify: `libs/designer-ui/src/lib/expressioneditor/index.tsx`

**Step 1: Verify ExpressionEditor works**

Run: `pnpm --filter @microsoft/designer-ui test -- expressioneditor --run`
Expected: Tests pass (or identify needed changes)

**Step 2: Update types if needed**

Update `libs/designer-ui/src/lib/expressioneditor/index.tsx` if type changes needed:
```typescript
import type { EditorContentChangedEvent as EditorContentChangedEventArgs } from '../editor/codemirror';
import { CodeMirrorEditor as MonacoEditor } from '../editor/codemirror';
import type { CodeMirrorEditorRef } from '../editor/codemirror';

// Update ref type
const expressionEditorRef = useRef<CodeMirrorEditorRef | null>(null);
```

**Step 3: Commit**

```bash
git add libs/designer-ui/src/lib/expressioneditor/index.tsx
git commit -m "refactor: update ExpressionEditor to use CodeMirror"
```

---

### Task 15: Update SchemaEditor Consumer

**Files:**
- Modify: `libs/designer-ui/src/lib/schemaeditor/index.tsx`

**Step 1: Update imports**

Update `libs/designer-ui/src/lib/schemaeditor/index.tsx`:
```typescript
import type { EditorContentChangedEvent as EditorContentChangedEventArgs } from '../editor/codemirror';
import { CodeMirrorEditor as MonacoEditor } from '../editor/codemirror';
import type { CodeMirrorEditorRef } from '../editor/codemirror';

// Update ref type
const modalEditorRef = useRef<CodeMirrorEditorRef | null>(null);
```

**Step 2: Run tests**

Run: `pnpm --filter @microsoft/designer-ui test -- schemaeditor --run`
Expected: Tests pass

**Step 3: Commit**

```bash
git add libs/designer-ui/src/lib/schemaeditor/index.tsx
git commit -m "refactor: update SchemaEditor to use CodeMirror"
```

---

### Task 16: Update TokenPicker Consumers

**Files:**
- Modify: `libs/designer-ui/src/lib/tokenpicker/index.tsx`
- Modify: `libs/designer-ui/src/lib/tokenpicker/tokenpickersection/tokenpickersection.tsx`
- Modify: `libs/designer-ui/src/lib/editor/base/plugins/TokenPickerButtonLegacy.tsx`

**Step 1: Update TokenPicker**

Update `libs/designer-ui/src/lib/tokenpicker/index.tsx`:
```typescript
import type { CodeMirrorEditorRef } from '../editor/codemirror';

// Change ref type
const expressionEditorRef = useRef<CodeMirrorEditorRef | null>(null);
```

**Step 2: Update TokenPickerSection**

Update `libs/designer-ui/src/lib/tokenpicker/tokenpickersection/tokenpickersection.tsx` - remove Monaco type import if present.

**Step 3: Update TokenPickerButtonLegacy**

Update `libs/designer-ui/src/lib/editor/base/plugins/TokenPickerButtonLegacy.tsx`:
```typescript
import type { CodeMirrorEditorRef } from '../../codemirror';

// Update prop type
codeEditor?: CodeMirrorEditorRef | null;
```

**Step 4: Commit**

```bash
git add libs/designer-ui/src/lib/tokenpicker/
git add libs/designer-ui/src/lib/editor/base/plugins/TokenPickerButtonLegacy.tsx
git commit -m "refactor: update TokenPicker components to use CodeMirror types"
```

---

### Task 17: Update Unit Testing Components

**Files:**
- Modify: `libs/designer-ui/src/lib/unitTesting/conditionExpression/index.tsx`

**Step 1: Update imports**

Check and update any Monaco imports in `libs/designer-ui/src/lib/unitTesting/conditionExpression/index.tsx`.

**Step 2: Commit**

```bash
git add libs/designer-ui/src/lib/unitTesting/
git commit -m "refactor: update unitTesting components to use CodeMirror"
```

---

## Phase 6: Cleanup

### Task 18: Remove Monaco Dependencies

**Files:**
- Modify: `libs/designer-ui/package.json`
- Delete: `libs/designer-ui/src/lib/editor/monaco/` (old files)
- Delete: `libs/designer-ui/src/lib/workflow/languageservice/workflowlanguageservice.ts`

**Step 1: Remove Monaco from package.json**

In `libs/designer-ui/package.json`, remove:
```json
"@monaco-editor/react": "4.6.0",
"monaco-editor": "0.44.0"
```

**Step 2: Delete old Monaco files**

Keep only the re-export file:
```bash
# Delete old Monaco implementation files (keep index.tsx for re-exports)
rm libs/designer-ui/src/lib/editor/monaco/monaco.styles.ts
```

**Step 3: Delete old workflow language service**

```bash
rm libs/designer-ui/src/lib/workflow/languageservice/workflowlanguageservice.ts
```

**Step 4: Run install to update lockfile**

Run: `pnpm install`

**Step 5: Commit**

```bash
git add -A
git commit -m "chore: remove Monaco Editor dependencies and old implementation"
```

---

### Task 19: Update Build Configs

**Files:**
- Modify: `libs/designer-ui/vitest.config.ts`
- Modify: `libs/designer/vitest.config.ts`
- Modify: `libs/chatbot/vitest.config.ts`
- Modify: `apps/Standalone/src/polyfills.ts`

**Step 1: Remove Monaco exclusions from vitest configs**

Check each vitest.config.ts for Monaco-specific exclusions and remove them.

**Step 2: Remove Monaco polyfills**

Update `apps/Standalone/src/polyfills.ts` - remove any Monaco worker setup code.

**Step 3: Commit**

```bash
git add -A
git commit -m "chore: remove Monaco-specific build configurations"
```

---

### Task 20: Run Full Test Suite

**Step 1: Run all designer-ui tests**

Run: `pnpm --filter @microsoft/designer-ui test -- --run`
Expected: All tests pass

**Step 2: Run full build**

Run: `pnpm run build:lib`
Expected: Build succeeds

**Step 3: Start development server**

Run: `pnpm run start`
Expected: App loads without errors

**Step 4: Manual verification**

1. Open Expression Editor - verify autocomplete works
2. Type function with `(` - verify signature help appears
3. Test Alt+/ keybinding - verify token picker opens
4. Toggle theme - verify colors change
5. Test JSON in SchemaEditor - verify syntax highlighting

**Step 5: Final commit**

```bash
git add -A
git commit -m "test: verify all editor functionality after CodeMirror migration"
```

---

## Summary

**Total Tasks:** 20
**Estimated Files Changed:** ~25
**New Files Created:** ~15
**Files Deleted:** ~5

**Key Milestones:**
1. Tasks 1-2: Dependencies & structure
2. Tasks 3-7: Core editor component
3. Tasks 8-11: Workflow language support
4. Tasks 12-17: Consumer migration
5. Tasks 18-20: Cleanup & verification
