import { SettingTextField } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps {
  textFieldLabel?: string;
  readOnly?: boolean;
  textFieldId?: string;
  textFieldValue?: string;
  defaultChecked?: boolean;
}

export const ReactiveToggle: React.FC<ReactiveToggleProps> = ({
  textFieldValue,
  textFieldLabel,
  textFieldId,
  readOnly = false,
  defaultChecked,
}: ReactiveToggleProps): JSX.Element => {
  const [checkedState, setChecked] = useState(!!defaultChecked);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!!checked);
  };

  return (
    <>
      <SettingToggle checked={checkedState} readOnly={readOnly} onToggleInputChange={onToggleInputChange} />
      {checkedState ? <SettingTextField id={textFieldId} value={textFieldValue} label={textFieldLabel} readOnly={readOnly} /> : null}
    </>
  );
};
