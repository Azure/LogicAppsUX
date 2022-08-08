// import { useState } from 'react';
import type { TokenGroup } from '../models/token';
import { TokenPickerOptions } from './tokenpickeroption';

interface TokenPickerSectionProps {
  tokenGroup: TokenGroup[];
  searchQuery: string;
}
export const TokenPickerSection = ({ tokenGroup, searchQuery }: TokenPickerSectionProps): JSX.Element => {
  // const [noTokens, setNoTokens] = useState(false);

  return (
    <div className="msla-token-picker-sections">
      {tokenGroup.map((section, i) => {
        return (
          <div key={`token-picker-section-${i}`} className={'msla-token-picker-sections'}>
            <TokenPickerOptions section={section} searchQuery={searchQuery} />
          </div>
        );
      })}
    </div>
  );
};
