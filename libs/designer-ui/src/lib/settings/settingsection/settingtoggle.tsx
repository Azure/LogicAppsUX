import type { SettingProps } from './';
import type { IToggleProps } from '@fluentui/react';
import { Toggle } from '@fluentui/react';
import { useIntl } from 'react-intl';

export type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

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
  const intl = useIntl();
  const defaultOnText = intl.formatMessage({
    defaultMessage: 'On',
    id: 'dad4d0d002b1',
    description: 'label when setting is on',
  });
  const defaultOffText = intl.formatMessage({
    defaultMessage: 'Off',
    id: 'd61b52b3b519',
    description: 'label when setting is off',
  });
  return (
    <>
      {customLabel ? customLabel : null}
      <Toggle
        className="msla-setting-section-toggle"
        checked={checked}
        disabled={readOnly}
        onText={onText ?? defaultOnText}
        offText={offText ?? defaultOffText}
        onChange={onToggleInputChange}
        label={label}
        ariaLabel={ariaLabel}
      />
    </>
  );
};
