import type { IIconStyles } from '@fluentui/react';
import { css, FontSizes, Icon, MessageBarType, TooltipHost, TooltipOverflowMode } from '@fluentui/react';

export interface ErrorBannerProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
}

const iconStyles: IIconStyles = {
  root: {
    paddingRight: 2,
    fontSize: FontSizes.small,
    lineHeight: '16px',
    float: 'left',
  },
};

const ICON_MAP = {
  [MessageBarType.info]: 'Info',
  [MessageBarType.warning]: 'Info',
  [MessageBarType.error]: 'ErrorBadge',
  [MessageBarType.blocked]: 'Blocked2',
  [MessageBarType.severeWarning]: 'Warning',
  [MessageBarType.success]: 'Completed',
};

export const ErrorBanner: React.FC<ErrorBannerProps> = ({ errorLevel, errorMessage }) => {
  if (errorLevel === undefined || !errorMessage) {
    return null;
  }

  return (
    <TooltipHost content={errorMessage} overflowMode={TooltipOverflowMode.Parent} hostClassName={'msla-panel-card-error-wrapper'}>
      <div className={css('msla-panel-card-error', MessageBarType[errorLevel])}>
        <Icon iconName={ICON_MAP[errorLevel]} className="msla-panel-card-error-icon" styles={iconStyles} />
        <div className="msla-panel-card-error-text">{errorMessage}</div>
      </div>
    </TooltipHost>
  );
};
