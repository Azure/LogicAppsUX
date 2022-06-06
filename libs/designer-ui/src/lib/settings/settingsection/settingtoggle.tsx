import type { IToggleProps } from '@fluentui/react';
import { Toggle } from '@fluentui/react';
import { useIntl } from 'react-intl';

type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

export interface SettingProps {
  visible: boolean;
  readOnly?: boolean;
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
  visible,
  customLabel,
}: SettingToggleProps): JSX.Element | null => {
  const intl = useIntl();

  const formattedOnText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'Label text when toggle is on',
  });
  const formattedOffText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'Label text when toggle is off',
  });

  if (!visible) {
    return null;
  }

  if (customLabel) {
    return (
      <>
        {customLabel()}
        <Toggle
          className="msla-setting-section-toggle"
          checked={checked}
          disabled={readOnly}
          onText={formattedOnText}
          offText={formattedOffText}
          onChange={onToggleInputChange}
          label={label}
        />
      </>
    );
  }

  return (
    <Toggle
      className="msla-setting-section-toggle"
      checked={checked}
      disabled={readOnly}
      onText={formattedOnText}
      offText={formattedOffText}
      onChange={onToggleInputChange}
      label={label}
    />
  );
};
