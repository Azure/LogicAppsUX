import { SettingTextField } from './settingtextfield';
import type { TextInputChangeHandler } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import type { SettingProps, ToggleChangeHandler } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps extends SettingProps {
  textFieldLabel: string;
  textFieldId?: string;
  textFieldValue: string;
  checked?: boolean;
  onToggleLabel: string;
  offToggleLabel: string;
  onToggleInputChange?: ToggleChangeHandler;
  onValueChange?: TextInputChangeHandler;
}

export const ReactiveToggle: React.FC<ReactiveToggleProps> = ({
  textFieldValue,
  textFieldLabel,
  textFieldId,
  readOnly = false,
  checked,
  customLabel,
  onToggleLabel,
  offToggleLabel,
  onToggleInputChange,
  onValueChange,
  ariaLabel,
}: ReactiveToggleProps): JSX.Element | null => {
  const [checkedState, setChecked] = useState(checked ?? false);
  const onToggleInput = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!!checked);
    onToggleInputChange?.(e, checked);
  };

  if (customLabel) {
    return (
      <>
        {customLabel()}
        <SettingToggle
          checked={checkedState}
          ariaLabel={ariaLabel}
          readOnly={readOnly}
          onToggleInputChange={onToggleInput}
          onText={onToggleLabel}
          offText={offToggleLabel}
        />
        {checkedState ? (
          <SettingTextField
            id={textFieldId}
            ariaLabel={ariaLabel}
            value={textFieldValue}
            label={textFieldLabel}
            readOnly={readOnly}
            onValueChange={onValueChange}
          />
        ) : null}
      </>
    );
  } else {
    return (
      <>
        <SettingToggle
          checked={checkedState}
          readOnly={readOnly}
          ariaLabel={ariaLabel}
          onToggleInputChange={onToggleInput}
          onText={onToggleLabel}
          offText={offToggleLabel}
        />
        {checkedState ? (
          <SettingTextField
            id={textFieldId}
            ariaLabel={ariaLabel}
            value={textFieldValue}
            label={textFieldLabel}
            readOnly={readOnly}
            onValueChange={onValueChange}
          />
        ) : null}
      </>
    );
  }
};
