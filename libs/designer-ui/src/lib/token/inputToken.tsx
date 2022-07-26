import { getBrandColorRgbA } from '../card/utils';
import { DELETE_TOKEN_NODE } from '../editor/base/plugins/DeleteTokenNode';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import type { NodeKey } from 'lexical';
import { useIntl } from 'react-intl';

export interface InputTokenProps {
  brandColor?: string;
  description?: string;
  disableFiltering?: boolean;
  icon: string;
  isAdvanced?: boolean;
  isSecure?: boolean;
  readOnly?: boolean;
  required?: boolean;
  title: string;
  nodeKey?: NodeKey;
}

export const DELETE = '\u00D7';
export const InputToken: React.FC<InputTokenProps> = ({ description, brandColor, icon, readOnly, title, nodeKey }) => {
  const intl = useIntl();
  const [editor] = useLexicalComposerContext();
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
  };

  const tokenStyle = {
    backgroundColor: getBrandColorRgbA(brandColor),
    backgroundImage: icon,
  };

  const tokenDelete = intl.formatMessage({
    defaultMessage: 'Delete',
    description: 'Label of Delete Token Button',
  });

  const handleTokenDeleteClicked = () => {
    if (nodeKey) {
      editor.dispatchCommand(DELETE_TOKEN_NODE, nodeKey);
    }
  };

  const renderTokenDeleteButton = (): JSX.Element | null => {
    if (readOnly) {
      return null;
    }

    return (
      <button title={tokenDelete} aria-label={tokenDelete} className="msla-button msla-token-delete" onClick={handleTokenDeleteClicked}>
        {DELETE}
      </button>
    );
  };

  return (
    <div className="msla-token msla-input-token" onClick={handleClick} style={tokenStyle}>
      <div className="msla-token-title" title={description}>
        {title}
      </div>
      {renderTokenDeleteButton()}
    </div>
  );
};
