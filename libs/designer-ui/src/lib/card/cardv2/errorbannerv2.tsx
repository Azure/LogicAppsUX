import { Icon, IIconStyles } from '@fluentui/react/lib/Icon';
import { MessageBarType } from '@fluentui/react/lib/MessageBar';
import { TooltipHost, TooltipOverflowMode } from '@fluentui/react/lib/Tooltip';
import * as React from 'react';

export interface ErrorBannerProps {
  errorLevel?: MessageBarType;
  errorMessage?: string;
}

const iconStyles: IIconStyles = {
  root: {
    paddingRight: '2px',
    fontSize: '12px',
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

export function ErrorBannerV2(props: ErrorBannerProps): JSX.Element | null {
  const { errorLevel, errorMessage } = props;
  if (errorLevel === undefined || !errorMessage) {
    return null;
  }

  return (
    <div className={`panel-card-error ${MessageBarType[errorLevel]}`} tabIndex={0}>
      <Icon iconName={ICON_MAP[errorLevel]} className="panel-card-error-icon" styles={iconStyles} />
      <TooltipHost content={errorMessage} overflowMode={TooltipOverflowMode.Parent}>
        {errorMessage}
      </TooltipHost>
    </div>
  );
}
