import { getBrandColorRgbA } from '../card/utils';
import constants from '../constants';
import { useIntl } from 'react-intl';

export interface TokenProps {
  brandColor?: string;
  description?: string;
  disableFiltering?: boolean;
  icon: string;
  isAdvanced: boolean;
  isSecure?: boolean;
  key?: string;
  required?: boolean;
  title: string;
}

export const Token: React.FC<TokenProps> = ({ description, brandColor, icon, title }) => {
  const intl = useIntl();
  const handleClick = (e: React.MouseEvent<HTMLElement>) => {
    e.preventDefault();
  };

  const tokenStyle = {
    backgroundColor: getBrandColorRgbA(brandColor),
  };
  const imageStyle = {
    backgroundColor: brandColor ?? constants.DEFAULT_BRAND_COLOR,
  };

  const iconAltText = intl.formatMessage({
    defaultMessage: 'Token Icon',
    description: 'Text to show if icon does not load',
  });

  return (
    <button className="msla-token" onClick={handleClick} style={tokenStyle}>
      <img className="msla-token-icon" src={icon} style={imageStyle} alt={iconAltText} />
      <div className="msla-token-title" title={description}>
        {title}
      </div>
    </button>
  );
};
