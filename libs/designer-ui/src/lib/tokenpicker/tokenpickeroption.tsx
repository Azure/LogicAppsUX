import type { OutputToken } from '.';
import { ValueSegmentType } from '../editor';
import { INSERT_TOKEN_NODE } from '../editor/base/plugins/InsertTokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { guid } from '@microsoft-logic-apps/utils';

interface TokenPickerOptionsProps {
  tokens: OutputToken[];
}
export const TokenPickerOptions = ({ tokens }: TokenPickerOptionsProps): JSX.Element => {
  const [editor] = useLexicalComposerContext();

  const handleCreateToken = (token: OutputToken) => {
    editor.dispatchCommand(INSERT_TOKEN_NODE, {
      brandColor: token.brandColor,
      description: token.description,
      title: token.title,
      icon: `url("${token.icon}")`,
      data: {
        id: guid(),
        type: ValueSegmentType.TOKEN,
        value: token.title,
        token: { ...token, tokenType: token.outputInfo.type },
      },
    });
  };
  return (
    <div className="msla-token-picker-section-options">
      {tokens.map((token, j) => {
        return (
          <button className="msla-token-picker-section-option" key={`token-picker-option-${j}`} onClick={() => handleCreateToken(token)}>
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
