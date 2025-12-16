# Monaco to CodeMirror Migration Design

**Date:** 2025-01-14
**Status:** Approved
**Author:** Design collaboration

## Overview

Replace Monaco Editor with CodeMirror 6 across the entire `designer-ui` package to achieve better performance, smaller bundle size, easier build system integration, and improved customizability.

## Decision Summary

| Decision | Choice |
|----------|--------|
| Feature parity | Full - all callbacks, language features, programmatic access |
| Migration strategy | Big bang - replace everywhere at once |
| Custom language | Lezer grammar for workflow expressions |
| Theming | Fluent UI v9 design tokens bridge |
| API surface | Same props as MonacoEditor (drop-in replacement) |
| Bundle approach | Standard imports with Vite tree-shaking |

## Motivation

- **Bundle size:** Monaco is ~2MB, CodeMirror is ~150KB (~90% reduction)
- **Build complexity:** Monaco requires worker setup and special Vite config
- **Customizability:** CodeMirror's extension system is more flexible
- **Maintenance:** CodeMirror 6 has a cleaner, more modern API

## Architecture

### Package Structure

```
libs/designer-ui/src/lib/editor/
├── codemirror/
│   ├── index.tsx                    # Main CodeMirrorEditor component
│   ├── codemirror.styles.ts         # makeStyles theme integration
│   ├── extensions/
│   │   ├── keybindings.ts           # Custom keybindings (Alt+/)
│   │   ├── events.ts                # Event callback extensions
│   │   └── readonly.ts              # Read-only mode extension
│   ├── languages/
│   │   ├── workflow/
│   │   │   ├── workflow.grammar     # Lezer grammar definition
│   │   │   ├── workflow.ts          # Language support bundle
│   │   │   ├── completion.ts        # Autocomplete provider
│   │   │   └── signature.ts         # Signature help provider
│   │   └── index.ts                 # Language registry
│   └── themes/
│       └── fluent.ts                # Fluent UI v9 token bridge
├── monaco/                          # (deleted after migration)
└── index.ts                         # Re-exports CodeMirrorEditor
```

## Component API

### Props Mapping

The `CodeMirrorEditor` component maintains the exact same props interface as `MonacoEditor`.

#### Direct Mappings

| Monaco Prop | CodeMirror Equivalent |
|-------------|----------------------|
| `value` | `EditorState.doc` |
| `defaultValue` | Initial `doc` in state config |
| `language` | Language extension (`@codemirror/lang-json`, etc.) |
| `readOnly` | `EditorState.readOnly` facet |
| `height/width` | CSS on container + `EditorView.theme` |
| `lineNumbers` | `lineNumbers()` extension |
| `wordWrap` | `EditorView.lineWrapping` |
| `folding` | `foldGutter()` extension |
| `fontSize` | Theme styling |

#### Event Callback Mappings

| Monaco Event | CodeMirror Approach |
|--------------|---------------------|
| `onContentChanged` | `EditorView.updateListener` checking `docChanged` |
| `onBlur` / `onFocus` | `EditorView.focusChangeEffect` |
| `onCursorPositionChanged` | `EditorView.updateListener` checking selection |
| `onScrollChanged` | `EditorView.scrollHandler` |

#### Ref Behavior

The forwarded ref exposes a compatibility object with methods matching `editor.IStandaloneCodeEditor`:

```typescript
interface CodeMirrorEditorRef {
  getValue(): string;
  setValue(text: string): void;
  getSelection(): SelectionRange;
  setSelection(range: SelectionRange): void;
  executeEdits(edits: ChangeSpec[]): void;
  focus(): void;
  getPosition(): { lineNumber: number; column: number };
}
```

## Workflow Expression Language

### Lezer Grammar

```lezer
@top Expression { element* }

element {
  FunctionCall |
  StringLiteral |
  NumberLiteral |
  Keyword |
  PropertyAccess |
  Parentheses |
  Comma
}

FunctionCall { Identifier "(" ArgList? ")" }
ArgList { element ("," element)* }
PropertyAccess { "[" StringLiteral "]" | "." Identifier }
Parentheses { "(" element* ")" }

@tokens {
  Identifier { $[a-zA-Z_] $[a-zA-Z0-9_]* }
  StringLiteral { "'" (!['\\] | "\\" _)* "'" }
  NumberLiteral { $[0-9]+ ("." $[0-9]+)? }
  Keyword { "null" | "true" | "false" }
  Comma { "," }
  whitespace { $[ \t\n\r]+ }
}

@skip { whitespace }
```

### Highlighting Tags

- `FunctionCall/Identifier` → `tags.function` (gold/blue based on theme)
- `StringLiteral` → `tags.string` (red/orange)
- `NumberLiteral` → `tags.number` (green)
- `Keyword` → `tags.keyword` (blue)

### Autocomplete

Reuses existing `FunctionGroupDefinitions` from `templatefunctions.ts`:

```typescript
const workflowCompletion = completeFromList(
  templateFunctions.map(fn => ({
    label: fn.name,
    type: "function",
    info: fn.description,
    apply: fn.signatures.every(s => s.parameters.length === 0)
      ? `${fn.name}()`
      : fn.name
  }))
);
```

### Signature Help

Implemented as a tooltip extension that:
- Triggers on `(` and `,` keystrokes
- Parses current position using the Lezer tree
- Finds enclosing function call node
- Counts arguments to determine active parameter
- Displays tooltip with signature from `FunctionGroupDefinitions`
- Handles variable-parameter functions

## Theme Integration

### Fluent UI v9 Design Tokens Bridge

```typescript
import { tokens } from '@fluentui/react-components';
import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

export const createFluentTheme = (isInverted: boolean) => {
  const editorTheme = EditorView.theme({
    '&': {
      backgroundColor: tokens.colorNeutralBackground1,
      color: tokens.colorNeutralForeground1,
    },
    '.cm-cursor': {
      borderLeftColor: tokens.colorNeutralForeground1,
    },
    '.cm-selectionBackground': {
      backgroundColor: tokens.colorNeutralBackground1Selected,
    },
    '.cm-gutters': {
      backgroundColor: tokens.colorNeutralBackground2,
      borderRight: `1px solid ${tokens.colorNeutralStroke1}`,
    },
  });

  const highlighting = HighlightStyle.define([
    { tag: tags.function, color: isInverted ? '#ffd700' : '#110188' },
    { tag: tags.string, color: isInverted ? '#ce9178' : '#a31515' },
    { tag: tags.number, color: isInverted ? '#b5cea8' : '#098658' },
    { tag: tags.keyword, color: isInverted ? '#569cd6' : '#0000ff' },
  ]);

  return [editorTheme, syntaxHighlighting(highlighting)];
};
```

Theme updates use CodeMirror's compartment system for efficient re-configuration when `useTheme().isInverted` changes.

## Dependencies

### Add to `designer-ui/package.json`

```json
{
  "dependencies": {
    "@codemirror/autocomplete": "^6.18.0",
    "@codemirror/commands": "^6.6.0",
    "@codemirror/lang-json": "^6.0.1",
    "@codemirror/lang-python": "^6.1.6",
    "@codemirror/language": "^6.10.0",
    "@codemirror/lint": "^6.8.0",
    "@codemirror/search": "^6.5.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.28.0",
    "@lezer/generator": "^1.7.0",
    "@lezer/highlight": "^1.2.0",
    "@lezer/lr": "^1.4.0"
  }
}
```

### Remove

```json
{
  "dependencies": {
    "@monaco-editor/react": "4.6.0",
    "monaco-editor": "0.44.0"
  }
}
```

### Other Packages

- `apps/Standalone/package.json` - Remove Monaco
- `apps/Standalone/src/polyfills.ts` - Remove Monaco worker setup
- `libs/designer/package.json` - Remove Monaco if listed
- `libs/chatbot/package.json` - Remove Monaco if listed
- Remove Monaco-specific Vite config and vitest exclusions

## File Changes

### Create (New)

- `libs/designer-ui/src/lib/editor/codemirror/index.tsx`
- `libs/designer-ui/src/lib/editor/codemirror/codemirror.styles.ts`
- `libs/designer-ui/src/lib/editor/codemirror/extensions/keybindings.ts`
- `libs/designer-ui/src/lib/editor/codemirror/extensions/events.ts`
- `libs/designer-ui/src/lib/editor/codemirror/extensions/readonly.ts`
- `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/workflow.grammar`
- `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/workflow.ts`
- `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/completion.ts`
- `libs/designer-ui/src/lib/editor/codemirror/languages/workflow/signature.ts`
- `libs/designer-ui/src/lib/editor/codemirror/languages/index.ts`
- `libs/designer-ui/src/lib/editor/codemirror/themes/fluent.ts`

### Modify

- `libs/designer-ui/src/lib/code/index.tsx` - Update import path
- `libs/designer-ui/src/lib/expressioneditor/index.tsx` - Update import path
- `libs/designer-ui/src/lib/schemaeditor/index.tsx` - Update import path
- `libs/designer-ui/src/lib/tokenpicker/tokenpickersection/tokenpickersection.tsx` - Update import
- `libs/designer-ui/src/lib/unitTesting/conditionExpression/index.tsx` - Update import
- `libs/designer-ui/src/lib/editor/base/plugins/TokenPickerButtonLegacy.tsx` - Update types

### Delete

- `libs/designer-ui/src/lib/editor/monaco/` (entire folder)
- `libs/designer-ui/src/lib/workflow/languageservice/workflowlanguageservice.ts`

## Testing Strategy

### Unit Tests to Create

- `codemirror/index.test.tsx` - Component rendering, props handling, ref methods
- `codemirror/extensions/events.test.ts` - Event callback firing
- `codemirror/languages/workflow/completion.test.ts` - Autocomplete suggestions
- `codemirror/languages/workflow/signature.test.ts` - Signature help display
- `codemirror/themes/fluent.test.ts` - Theme token mapping

### Manual Verification Checklist

1. Expression editor: Type function names, verify autocomplete appears
2. Expression editor: Type `(`, verify signature help shows
3. Code editor: Insert token via Alt+/, verify insertion works
4. Schema editor: Paste JSON, verify syntax highlighting
5. All editors: Toggle light/dark theme, verify colors update
6. All editors: Test read-only mode
7. Token picker: Open expression mode, type expression, verify parsing

### E2E Tests

Existing Playwright tests should continue working since DOM interactions remain the same. May need selector updates if data attributes change.

## Expected Outcomes

- ~90% bundle size reduction for editor code (~150KB vs ~2MB)
- Simpler build config (no Monaco workers)
- Better customizability via CodeMirror's extension system
- Future-proof theming aligned with Fluent v9 migration
- Zero API changes for consumers (drop-in replacement)
