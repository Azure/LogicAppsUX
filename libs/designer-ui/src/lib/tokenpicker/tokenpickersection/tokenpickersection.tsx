import type { TokenGroup } from '../models/token';
import { TokenPickerNoMatches } from './tokenpickernomatches';
import { TokenPickerOptions } from './tokenpickeroption';
import { useEffect, useState } from 'react';

interface TokenPickerSectionProps {
  tokenGroup: TokenGroup[];
  searchQuery: string;
}
export const TokenPickerSection = ({ tokenGroup, searchQuery }: TokenPickerSectionProps): JSX.Element => {
  const [tokenLength, setTokenLength] = useState(new Array<number>(tokenGroup.length));
  const [noItems, setNoItems] = useState(false);

  useEffect(() => {
    setNoItems(tokenLength.reduce((sum, a) => sum + a, 0) === 0);
  }, [searchQuery, tokenLength]);

  return (
    <div className="msla-token-picker-sections">
      {searchQuery ? <TokenPickerNoMatches noItems={noItems} /> : null}
      {tokenGroup.map((section, i) => {
        if (section.tokens.length > 0) {
          return (
            <div key={`token-picker-section-${i}`} className={'msla-token-picker-section'}>
              <TokenPickerOptions section={section} searchQuery={searchQuery} index={i} setTokenLength={setTokenLength} />
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};
