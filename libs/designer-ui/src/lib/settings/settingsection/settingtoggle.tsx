import type { IToggleProps } from '@fluentui/react';
import { Toggle } from '@fluentui/react';

type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

export interface SettingToggleProps extends IToggleProps {
  readOnly?: boolean;
  onLabel: string;
  offLabel: string;
  onToggleInputChange?: ToggleChangeHandler;
}

export const SettingToggle = ({ readOnly, onToggleInputChange, checked, onLabel, offLabel }: SettingToggleProps): JSX.Element => {
  return (
    <Toggle
      className="msla-setting-section-toggle"
      checked={checked}
      disabled={readOnly}
      onText={onLabel}
      offText={offLabel}
      onChange={onToggleInputChange}
    />
  );
};
