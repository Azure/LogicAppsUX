import type { TokenGroup } from '../models/token';
import { TokenPickerOptions } from './tokenpickeroption';
import { useEffect, useState } from 'react';

interface TokenPickerSectionProps {
  tokenGroup: TokenGroup[];
  searchQuery: string;
}
export const TokenPickerSection = ({ tokenGroup, searchQuery }: TokenPickerSectionProps): JSX.Element => {
  const [tokenLength, setTokenLength] = useState(new Array<number>(tokenGroup.length));

  useEffect(() => {
    console.log(tokenLength);
  }, [searchQuery, tokenLength]);

  return (
    <div className="msla-token-picker-sections">
      {tokenGroup.map((section, i) => {
        return (
          <div key={`token-picker-section-${i}`} className={'msla-token-picker-sections'}>
            <TokenPickerOptions section={section} searchQuery={searchQuery} index={i} setTokenLength={setTokenLength} />
          </div>
        );
      })}
    </div>
  );
};
