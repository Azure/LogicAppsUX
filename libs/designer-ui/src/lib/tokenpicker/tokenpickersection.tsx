import type { TokenGroup } from './models/token';
import { TokenPickerHeader } from './tokenpickerheader';
import { TokenPickerOptions } from './tokenpickeroption';

interface TokenPickerSectionProps {
  tokenGroup: TokenGroup[];
}
export const TokenPickerSection = ({ tokenGroup }: TokenPickerSectionProps): JSX.Element => {
  return (
    <div className="msla-token-picker-sections">
      {tokenGroup.map((section, i) => {
        return (
          <div key={`token-picker-section-${i}`} className={'msla-token-picker-sections'}>
            <TokenPickerHeader section={section} />
            <TokenPickerOptions tokens={section.tokens} />
          </div>
        );
      })}
    </div>
  );
};
