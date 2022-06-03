import { SettingTextField } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import type { SettingProps } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps extends SettingProps {
  textFieldLabel?: string;
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
  customLabel,
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
      {checkedState ? (
        <SettingTextField id={textFieldId} value={textFieldValue} label={textFieldLabel} customLabel={customLabel} readOnly={readOnly} />
      ) : null}
    </>
  );
};
