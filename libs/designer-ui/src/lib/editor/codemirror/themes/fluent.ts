import { EditorView } from '@codemirror/view';
import type { Extension } from '@codemirror/state';
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
