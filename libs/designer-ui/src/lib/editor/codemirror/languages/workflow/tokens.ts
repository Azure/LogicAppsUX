import { LanguageSupport, StreamLanguage, type StringStream } from '@codemirror/language';
import { HighlightStyle } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { FunctionGroupDefinitions } from '../../../../workflow/languageservice/templatefunctions';

// Get all function names for highlighting
const functionNames = new Set(FunctionGroupDefinitions.flatMap((group) => group.functions.map((fn) => fn.name.toLowerCase())));

const keywords = new Set(['null', 'true', 'false']);

interface WorkflowState {
  inString: boolean;
}

const workflowStreamParser = {
  name: 'workflow',
  startState: (): WorkflowState => ({ inString: false }),
  token: (stream: StringStream, _state: WorkflowState): string | null => {
    // Handle whitespace
    if (stream.eatSpace()) {
      return null;
    }

    // Handle strings (single-quoted in Logic Apps expressions)
    if (stream.peek() === "'") {
      stream.next();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === "'") {
          break;
        }
        if (ch === '\\') {
          stream.next();
        }
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
      if (functionNames.has(word)) {
        return 'function';
      }
      if (keywords.has(word)) {
        return 'keyword';
      }
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
