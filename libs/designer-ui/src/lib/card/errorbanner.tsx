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
    <div className={css('panel-card-error', MessageBarType[errorLevel])}>
      <Icon iconName={ICON_MAP[errorLevel]} className="panel-card-error-icon" styles={iconStyles} />
      <TooltipHost content={errorMessage} overflowMode={TooltipOverflowMode.Parent}>
        {errorMessage}
      </TooltipHost>
    </div>
  );
};
