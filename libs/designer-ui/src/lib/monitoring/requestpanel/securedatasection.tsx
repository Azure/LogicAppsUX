import Constants from '../../constants';
import { hexToRgbA } from '@microsoft-logic-apps/utils';
import { useIntl } from 'react-intl';

export interface SecureDataSectionProps {
  brandColor?: string;
  headerText: string;
}

export const SecureDataSection: React.FC<SecureDataSectionProps> = ({ brandColor, headerText }) => {
  const intl = useIntl();

  const Resources = {
    SANITIZED_TEXT: intl.formatMessage({
      defaultMessage: 'Content not shown due to security configuration.',
      description: 'Message text to inform the customer that the data is secure',
    }),
  };

  const borderStyle = {
    borderColor: hexToRgbA(brandColor || Constants.DEFAULT_BRAND_COLOR, 0.7),
  };

  return (
    <section className="msla-trace-inputs-outputs">
      <div className="msla-trace-inputs-outputs-header">
        <div style={borderStyle} className="msla-trace-inputs-outputs-header-text">
          {headerText}
        </div>
      </div>
      <div className="msla-trace-values">
        <div className="msla-trace-inputs-outputs-secured">
          <div className="msla-trace-secured-text">{Resources.SANITIZED_TEXT}</div>
        </div>
      </div>
    </section>
  );
};
