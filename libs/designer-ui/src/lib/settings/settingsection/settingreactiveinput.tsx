import type { SettingProps, ToggleChangeHandler } from './';
import { SettingTextField } from './settingtextfield';
import type { TextInputChangeHandler } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps extends SettingProps {
  textFieldLabel: string;
  textFieldId?: string;
  textFieldValue: string;
  textFieldPlaceholder?: string;
  checked?: boolean;
  onText?: string;
  offText?: string;
  onToggleInputChange?: ToggleChangeHandler;
  onValueChange?: TextInputChangeHandler;
}

export const ReactiveToggle: React.FC<ReactiveToggleProps> = ({
  textFieldValue,
  textFieldLabel,
  textFieldPlaceholder,
  textFieldId,
  readOnly = false,
  checked,
  customLabel,
  onText,
  offText,
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

  return (
    <>
      {customLabel ? customLabel : null}
      <SettingToggle
        checked={checkedState}
        readOnly={readOnly}
        ariaLabel={ariaLabel}
        onToggleInputChange={onToggleInput}
        onText={onText}
        offText={offText}
      />
      <div style={{ marginTop: '-10px', marginBottom: '10px' }}>
        {checkedState ? (
          <SettingTextField
            id={textFieldId}
            ariaLabel={ariaLabel}
            value={textFieldValue}
            label={textFieldLabel}
            placeholder={textFieldPlaceholder}
            readOnly={readOnly}
            onValueChange={onValueChange}
          />
        ) : null}
      </div>
    </>
  );
};
