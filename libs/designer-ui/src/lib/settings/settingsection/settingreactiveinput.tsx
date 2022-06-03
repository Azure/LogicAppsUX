import { SettingTextField } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps {
  textFieldLabel: string;
  readOnly?: boolean;
  textFieldId?: string;
  textFieldValue: string;
  defaultChecked?: boolean;
  onToggleLabel: string;
  offToggleLabel: string;
}

export const ReactiveToggle: React.FC<ReactiveToggleProps> = ({
  textFieldValue,
  textFieldLabel,
  textFieldId,
  readOnly = false,
  defaultChecked,
  onToggleLabel,
  offToggleLabel,
}: ReactiveToggleProps): JSX.Element => {
  const [checkedState, setChecked] = useState(defaultChecked ?? false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!!checked);
  };

  return (
    <>
      <SettingToggle
        checked={checkedState}
        readOnly={readOnly}
        onToggleInputChange={onToggleInputChange}
        onLabel={onToggleLabel}
        offLabel={offToggleLabel}
      />
      {checkedState ? <SettingTextField id={textFieldId} value={textFieldValue} label={textFieldLabel} readOnly={readOnly} /> : null}
    </>
  );
};
