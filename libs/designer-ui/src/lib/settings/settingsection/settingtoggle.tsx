import { Toggle, IToggleProps } from '@fluentui/react';
import { useIntl } from 'react-intl';

type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

export interface SettingToggleProps extends IToggleProps {
  isReadOnly: boolean;
  onToggleInputChange?: ToggleChangeHandler;
}

export const RenderToggleSetting: React.FC<SettingToggleProps> = ({ isReadOnly, onToggleInputChange, checked }): JSX.Element => {
  const intl = useIntl();

  const formattedOnText = intl.formatMessage({
    defaultMessage: 'On',
    description: 'Label text when toggle is on',
  });
  const formattedOffText = intl.formatMessage({
    defaultMessage: 'Off',
    description: 'Label text when toggle is off',
  });

  return (
    <Toggle
      className="msla-setting-section-toggle"
      checked={checked}
      disabled={isReadOnly}
      onText={formattedOnText}
      offText={formattedOffText}
      onChange={onToggleInputChange}
    />
  );
};
