import type { MenuTextMatch } from '@lexical/react/LexicalTypeaheadMenuPlugin';
import type { LexicalEditor } from 'lexical';
import { useCallback } from 'react';

export type TriggerFn = (text: string, editor: LexicalEditor) => MenuTextMatch | null;
export const PUNCTUATION = '\\.,\\+\\*\\?\\$\\@\\|#{}\\(\\)\\^\\-\\[\\]\\\\/!%\'"~=<>_:;';
export function useTokenTypeaheadTriggerMatch(
  trigger: string,
  { minLength = 1, maxLength = 1 }: { minLength?: number; maxLength?: number }
): TriggerFn {
  return useCallback(
    (text: string) => {
      const validChars = `[^${trigger}${PUNCTUATION}\\s]`;
      // eslint-disable-next-line no-useless-concat
      const TypeaheadTriggerRegex = new RegExp(`([${trigger}]((?:${validChars}){0,${maxLength}}))$`);
      const match = TypeaheadTriggerRegex.exec(text);
      if (match !== null) {
        const maybeLeadingWhitespace = match[1];
        const matchingString = match[2];
        if (matchingString.length >= minLength) {
          return {
            leadOffset: match.index + maybeLeadingWhitespace.length,
            matchingString,
            replaceableString: match[1],
          };
        }
      }
      return null;
    },
    [maxLength, minLength, trigger]
  );
}
