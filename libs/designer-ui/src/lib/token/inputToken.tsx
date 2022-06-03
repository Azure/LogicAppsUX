import { getBrandColorRgbA } from '../card/utils';
import { useIntl } from 'react-intl';

export interface TokenProps {
  brandColor?: string;
  description?: string;
  disableFiltering?: boolean;
  icon: string;
  isAdvanced: boolean;
  isSecure?: boolean;
  key?: string;
  readOnly?: boolean;
  required?: boolean;
  title: string;
  handleTokenDeleteClicked?(): (e: any) => void;
}

export const DELETE = '\u00D7';
export const InputToken: React.FC<TokenProps> = ({ description, brandColor, icon, readOnly, title, handleTokenDeleteClicked }) => {
  const intl = useIntl();
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
