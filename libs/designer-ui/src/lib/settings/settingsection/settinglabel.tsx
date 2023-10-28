import type { IButtonStyles } from '@fluentui/react';
import { IconButton, TooltipHost, css } from '@fluentui/react';

export interface SettingLabelProps {
  labelText: string;
  infoTooltipText?: string;
  settingDescription?: string;
  subLabelText?: string;
  isSubLabelToggle?: boolean;
}
const infoButtonStyles: IButtonStyles = {
  root: { color: '#8d8686' },
  rootHovered: {
    backgroundColor: 'transparent',
  },
  rootPressed: {
    backgroundColor: 'transparent',
  },
};

export function SettingLabel({
  labelText,
  infoTooltipText,
  settingDescription,
  subLabelText,
  isSubLabelToggle,
}: SettingLabelProps): JSX.Element {
  return (
    <>
      <div className="msla-setting-label-container">
        <div className="msla-setting-label-title">{labelText}</div>
        <TooltipHost content={infoTooltipText}>
          <IconButton
            role="tooltip"
            aria-label={infoTooltipText}
            className="msla-setting-label-tooltip-icon"
            iconProps={{ iconName: 'Info' }}
            styles={infoButtonStyles}
          />
        </TooltipHost>
      </div>
      {settingDescription ? <div className="msla-setting-label-description">{settingDescription}</div> : null}
      {subLabelText ? <div className={css('msla-setting-label-subLabel', isSubLabelToggle && 'isToggle')}>{subLabelText}</div> : null}
    </>
  );
}

export function getSettingLabel(
  labelText: string,
  infoTooltipText?: string,
  settingDescription?: string,
  subLabelText?: string,
  isSubLabelToggle?: boolean
): JSX.Element {
  return (
    <SettingLabel
      labelText={labelText}
      infoTooltipText={infoTooltipText}
      settingDescription={settingDescription}
      subLabelText={subLabelText}
      isSubLabelToggle={isSubLabelToggle}
    />
  );
}
