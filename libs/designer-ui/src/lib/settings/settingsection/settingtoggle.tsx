import type { IToggleProps } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

export type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

export interface SettingProps {
  readOnly?: boolean;
  ariaLabel?: string;
  customLabel?: () => JSX.Element;
}

export interface SettingToggleProps extends IToggleProps, SettingProps {
  onToggleInputChange?: ToggleChangeHandler;
}

export const SettingToggle = ({
  readOnly,
  onToggleInputChange,
  checked,
  label,
  customLabel,
  ariaLabel,
  onText,
  offText,
}: SettingToggleProps): JSX.Element | null => {
  if (customLabel) {
    return (
      <>
        {customLabel()}
        <Toggle
          className="msla-setting-section-toggle"
          checked={checked}
          disabled={readOnly}
          onText={onText}
          offText={offText}
          onChange={onToggleInputChange}
          label={label}
          ariaLabel={ariaLabel}
        />
      </>
    );
  }

  return (
    <Toggle
      className="msla-setting-section-toggle"
      checked={checked}
      disabled={readOnly}
      onText={onText}
      offText={offText}
      onChange={onToggleInputChange}
      label={label}
      ariaLabel={ariaLabel}
    />
  );
};
