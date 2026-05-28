import type { CompletionContext, CompletionResult, Completion } from '@codemirror/autocomplete';
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

  if (!word && !context.explicit) {
    return null;
  }

  const from = word?.from ?? context.pos;
  const text = word?.text.toLowerCase() ?? '';

  const options = allCompletions.filter((opt) => opt.label.toLowerCase().startsWith(text) || text === '');

  if (options.length === 0) {
    return null;
  }

  return {
    from,
    options,
    validFor: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  };
};
