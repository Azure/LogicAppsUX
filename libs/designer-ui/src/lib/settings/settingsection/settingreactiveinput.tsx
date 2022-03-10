import { SettingTextField } from './settingtextfield';
import { RenderToggleSetting } from './settingtoggle';
import { useState } from 'react';

interface ReactiveToggleProps {
  textFieldLabel: string;
  isReadOnly: boolean;
  textFieldId: string;
  textFieldValue: string;
  defaultChecked: boolean;
}

export const ReactiveToggle: React.FC<ReactiveToggleProps> = ({
  textFieldValue,
  textFieldLabel,
  textFieldId,
  isReadOnly,
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
      <RenderToggleSetting checked={checkedState} isReadOnly={isReadOnly} onToggleInputChange={onToggleInputChange} />
      {checkedState ? <SettingTextField id={textFieldId} value={textFieldValue} label={textFieldLabel} isReadOnly={isReadOnly} /> : null}
    </>
  );
};
