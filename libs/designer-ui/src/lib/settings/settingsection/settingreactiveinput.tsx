import { SettingTextField } from './settingtextfield';
import type { TextInputChangeHandler } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import type { SettingProps } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps extends SettingProps {
  textFieldLabel: string;
  textFieldId?: string;
  textFieldValue: string;
  checked?: boolean;
  onToggleLabel: string;
  offToggleLabel: string;
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
  onValueChange,
}: ReactiveToggleProps): JSX.Element | null => {
  const [checkedState, setChecked] = useState(checked ?? false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!!checked);
  };

  if (customLabel) {
    return (
      <>
        {customLabel()}
        <SettingToggle
          checked={checkedState}
          readOnly={readOnly}
          onToggleInputChange={onToggleInputChange}
          onText={onToggleLabel}
          offText={offToggleLabel}
        />
        {checkedState ? (
          <SettingTextField
            id={textFieldId}
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
          onToggleInputChange={onToggleInputChange}
          onText={onToggleLabel}
          offText={offToggleLabel}
        />
        {checkedState ? (
          <SettingTextField
            id={textFieldId}
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
