import type { Extension } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting } from '@codemirror/language';
import { workflowLanguage, workflowHighlighting } from './tokens';
import { workflowCompletion } from './completion';

export { workflowLanguage, workflowHighlighting, workflowStreamLanguage } from './tokens';
export { workflowCompletion } from './completion';
export { getSignatureAtPosition, type SignatureInfo } from './signature';

/**
 * Complete workflow language support bundle
 * Includes syntax highlighting and autocomplete.
 *
 * Signature help is intentionally NOT a floating editor tooltip — it is rendered
 * as an in-flow panel below the expression editor (see ExpressionEditor) so it
 * never overlaps the text being typed. See issue #9292.
 */
export const workflow = (): Extension[] => [
  workflowLanguage,
  syntaxHighlighting(workflowHighlighting),
  autocompletion({ override: [workflowCompletion] }),
];
