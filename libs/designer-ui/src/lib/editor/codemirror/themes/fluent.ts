import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// VS Code-like token colors for comprehensive syntax highlighting
const lightColors = {
  // Core syntax
  keyword: '#0000ff',
  controlKeyword: '#af00db',
  operator: '#000000',
  punctuation: '#000000',

  // Strings and literals
  string: '#a31515',
  number: '#098658',
  boolean: '#0000ff',
  null: '#0000ff',
  regexp: '#811f3f',

  // Comments
  comment: '#008000',
  docComment: '#008000',

  // Functions and methods
  function: '#795e26',
  method: '#795e26',

  // Variables and properties
  variable: '#001080',
  property: '#001080',
  parameter: '#001080',

  // Types and classes
  type: '#267f99',
  class: '#267f99',
  interface: '#267f99',
  enum: '#267f99',
  namespace: '#267f99',

  // XML/HTML specific
  tagName: '#800000',
  attributeName: '#ff0000',
  attributeValue: '#0000ff',

  // Special
  definition: '#795e26',
  constant: '#0070c1',
  meta: '#000000',
  invalid: '#ff0000',

  // Editor colors
  background: '#ffffff',
  foreground: '#000000',
  selection: '#add6ff',
  gutterBackground: '#f5f5f5',
  gutterBorder: '#e0e0e0',
  lineHighlight: '#fffbdd',
};

const darkColors = {
  // Core syntax
  keyword: '#569cd6',
  controlKeyword: '#c586c0',
  operator: '#d4d4d4',
  punctuation: '#d4d4d4',

  // Strings and literals
  string: '#ce9178',
  number: '#b5cea8',
  boolean: '#569cd6',
  null: '#569cd6',
  regexp: '#d16969',

  // Comments
  comment: '#6a9955',
  docComment: '#608b4e',

  // Functions and methods
  function: '#dcdcaa',
  method: '#dcdcaa',

  // Variables and properties
  variable: '#9cdcfe',
  property: '#9cdcfe',
  parameter: '#9cdcfe',

  // Types and classes
  type: '#4ec9b0',
  class: '#4ec9b0',
  interface: '#4ec9b0',
  enum: '#4ec9b0',
  namespace: '#4ec9b0',

  // XML/HTML specific
  tagName: '#569cd6',
  attributeName: '#9cdcfe',
  attributeValue: '#ce9178',

  // Special
  definition: '#dcdcaa',
  constant: '#4fc1ff',
  meta: '#d4d4d4',
  invalid: '#f44747',

  // Editor colors
  background: '#1e1e1e',
  foreground: '#d4d4d4',
  selection: '#264f78',
  gutterBackground: '#252526',
  gutterBorder: '#404040',
  lineHighlight: '#2a2d2e',
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
      '.cm-activeLine': {
        backgroundColor: colors.lineHighlight,
      },
    },
    { dark: isInverted }
  );

  const highlighting = HighlightStyle.define([
    // Comments
    { tag: tags.comment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.lineComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.blockComment, color: colors.comment, fontStyle: 'italic' },
    { tag: tags.docComment, color: colors.docComment, fontStyle: 'italic' },

    // Keywords
    { tag: tags.keyword, color: colors.keyword },
    { tag: tags.controlKeyword, color: colors.controlKeyword },
    { tag: tags.operatorKeyword, color: colors.keyword },
    { tag: tags.definitionKeyword, color: colors.keyword },
    { tag: tags.moduleKeyword, color: colors.keyword },

    // Operators and punctuation
    { tag: tags.operator, color: colors.operator },
    { tag: tags.punctuation, color: colors.punctuation },
    { tag: tags.bracket, color: colors.punctuation },
    { tag: tags.angleBracket, color: colors.punctuation },
    { tag: tags.squareBracket, color: colors.punctuation },
    { tag: tags.paren, color: colors.punctuation },
    { tag: tags.brace, color: colors.punctuation },
    { tag: tags.separator, color: colors.punctuation },

    // Literals
    { tag: tags.string, color: colors.string },
    { tag: tags.special(tags.string), color: colors.string },
    { tag: tags.character, color: colors.string },
    { tag: tags.number, color: colors.number },
    { tag: tags.integer, color: colors.number },
    { tag: tags.float, color: colors.number },
    { tag: tags.bool, color: colors.boolean },
    { tag: tags.null, color: colors.null },
    { tag: tags.regexp, color: colors.regexp },
    { tag: tags.escape, color: colors.regexp },

    // Functions and methods
    { tag: tags.function(tags.variableName), color: colors.function },
    { tag: tags.function(tags.definition(tags.variableName)), color: colors.function },
    { tag: tags.function(tags.propertyName), color: colors.method },

    // Variables
    { tag: tags.variableName, color: colors.variable },
    { tag: tags.definition(tags.variableName), color: colors.definition },
    { tag: tags.local(tags.variableName), color: colors.variable },
    { tag: tags.special(tags.variableName), color: colors.variable },

    // Properties
    { tag: tags.propertyName, color: colors.property },
    { tag: tags.definition(tags.propertyName), color: colors.property },

    // Types and classes
    { tag: tags.typeName, color: colors.type },
    { tag: tags.className, color: colors.class },
    { tag: tags.namespace, color: colors.namespace },
    { tag: tags.macroName, color: colors.constant },
    { tag: tags.labelName, color: colors.variable },

    // Constants
    { tag: tags.constant(tags.variableName), color: colors.constant },
    { tag: tags.standard(tags.variableName), color: colors.constant },

    // XML/HTML tags
    { tag: tags.tagName, color: colors.tagName },
    { tag: tags.attributeName, color: colors.attributeName },
    { tag: tags.attributeValue, color: colors.attributeValue },

    // Meta and special
    { tag: tags.meta, color: colors.meta },
    { tag: tags.annotation, color: colors.type },
    { tag: tags.processingInstruction, color: colors.meta },
    { tag: tags.invalid, color: colors.invalid, textDecoration: 'underline wavy' },

    // Headings for markdown/docs
    { tag: tags.heading, color: colors.keyword, fontWeight: 'bold' },
    { tag: tags.heading1, color: colors.keyword, fontWeight: 'bold', fontSize: '1.4em' },
    { tag: tags.heading2, color: colors.keyword, fontWeight: 'bold', fontSize: '1.3em' },
    { tag: tags.heading3, color: colors.keyword, fontWeight: 'bold', fontSize: '1.2em' },

    // Emphasis
    { tag: tags.emphasis, fontStyle: 'italic' },
    { tag: tags.strong, fontWeight: 'bold' },
    { tag: tags.strikethrough, textDecoration: 'line-through' },

    // Links
    { tag: tags.link, color: colors.constant, textDecoration: 'underline' },
    { tag: tags.url, color: colors.constant },

    // Atom (for languages like Prolog, Erlang)
    { tag: tags.atom, color: colors.constant },

    // Self reference (this, self)
    { tag: tags.self, color: colors.keyword },

    // Content (for document-like formats)
    { tag: tags.content, color: colors.foreground },
  ]);

  return [editorTheme, syntaxHighlighting(highlighting)];
};
