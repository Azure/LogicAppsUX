import type { OutputToken } from '.';

interface TokenPickerOptionsProps {
  tokens: OutputToken[];
}
export const TokenPickerOptions = ({ tokens }: TokenPickerOptionsProps): JSX.Element => {
  return (
    <div className="msla-token-picker-section-options">
      {tokens.map((token, j) => {
        return (
          <button className="msla-token-picker-section-option" key={`token-picker-option-${j}`}>
            <img src={token.icon} alt="" />
            <div className="msla-token-picker-section-option-text">
              <div className="msla-token-picker-option-inner">
                <div className="msla-token-picker-option-title">{token.title}</div>
                <div className="msla-token-picker-option-description">{token.description}</div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
};
