import type { SettingProps } from './';
import type { SwitchProps } from '@fluentui/react-components';
import { Switch } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { useStyles } from './settingtoggle.styles';

export type ToggleChangeHandler = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => void;

export interface SettingToggleProps extends Omit<SwitchProps, 'onChange'>, SettingProps {
  onToggleInputChange?: ToggleChangeHandler;
  onText?: string;
  offText?: string;
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
  ...rest
}: SettingToggleProps): JSX.Element | null => {
  const intl = useIntl();
  const styles = useStyles();

  const defaultOnText = intl.formatMessage({
    defaultMessage: 'On',
    id: '2tTQ0A',
    description: 'label when setting is on',
  });
  const defaultOffText = intl.formatMessage({
    defaultMessage: 'Off',
    id: '1htSs7',
    description: 'label when setting is off',
  });

  // v9 Switch onChange handler provides the checked state directly
  const handleChange = (ev: React.ChangeEvent<HTMLInputElement>) => {
    if (onToggleInputChange) {
      // Convert to match the existing handler signature
      onToggleInputChange(ev as any, ev.currentTarget.checked);
    }
  };

  return (
    <>
      {customLabel ? customLabel : null}
      <div className={styles.root}>
        <Switch
          checked={checked}
          disabled={readOnly}
          onChange={handleChange}
          label={label || `${checked ? (onText ?? defaultOnText) : (offText ?? defaultOffText)}`}
          labelPosition="before"
          aria-label={ariaLabel}
          {...rest}
        />
      </div>
    </>
  );
};
