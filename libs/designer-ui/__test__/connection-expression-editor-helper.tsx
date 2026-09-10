import type { ComponentProps } from 'react';
import type { LexicalEditor } from 'lexical';
import { vi } from 'vitest';

export { $createParagraphNode, $createTextNode, $getRoot } from 'lexical';

// Keep this helper in designer-ui so pnpm resolves the same Lexical dependency
// and conditional ESM entry points as the real editor, but outside src so its
// test-only mocks are not instrumented as production code.
const connectionExpressionEditor = vi.hoisted(() => ({
  current: undefined as LexicalEditor | undefined,
}));

export { connectionExpressionEditor };

vi.mock('@lexical/react/LexicalOnChangePlugin', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@lexical/react/LexicalOnChangePlugin')>();
  const { useLexicalComposerContext } = await import('@lexical/react/LexicalComposerContext');
  return {
    OnChangePlugin: (props: ComponentProps<typeof actual.OnChangePlugin>) => {
      [connectionExpressionEditor.current] = useLexicalComposerContext();
      return <actual.OnChangePlugin {...props} />;
    },
  };
});
