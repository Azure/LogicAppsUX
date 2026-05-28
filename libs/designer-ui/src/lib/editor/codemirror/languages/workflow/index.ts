import type { Extension } from '@codemirror/state';
import { autocompletion } from '@codemirror/autocomplete';
import { syntaxHighlighting } from '@codemirror/language';
import { workflowLanguage, workflowHighlighting } from './tokens';
import { workflowCompletion } from './completion';
import { workflowSignatureHelp } from './signature';

export { workflowLanguage, workflowHighlighting, workflowStreamLanguage } from './tokens';
export { workflowCompletion } from './completion';
export { workflowSignatureHelp, getSignatureAtPosition } from './signature';

/**
 * Complete workflow language support bundle
 * Includes syntax highlighting, autocomplete, and signature help
 */
export const workflow = (): Extension[] => [
  workflowLanguage,
  syntaxHighlighting(workflowHighlighting),
  autocompletion({ override: [workflowCompletion] }),
  workflowSignatureHelp,
];
