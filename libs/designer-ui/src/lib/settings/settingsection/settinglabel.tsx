import { css } from '@fluentui/react';
import { Tooltip } from '@fluentui/react-components';
import { Info16Regular } from '@fluentui/react-icons';

export interface SettingLabelProps {
  labelText: string;
  infoTooltipText?: string;
  settingDescription?: string;
  subLabelText?: string;
  isSubLabelToggle?: boolean;
}

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
        <Tooltip relationship="label" content={infoTooltipText ?? ''} aria-label={infoTooltipText}>
          <Info16Regular className="msla-setting-label-tooltip-icon" />
        </Tooltip>
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
