import { SettingTextField } from './settingtextfield';
import { SettingToggle } from './settingtoggle';
import type { SettingProps } from './settingtoggle';
import { useState } from 'react';

export interface ReactiveToggleProps extends SettingProps {
  textFieldLabel: string;
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
  customLabel,
  visible,
  onToggleLabel,
  offToggleLabel,
}: ReactiveToggleProps): JSX.Element | null => {
  const [checkedState, setChecked] = useState(defaultChecked ?? false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!!checked);
  };

  if (!visible) {
    return null;
  }
  return (
    <>
      <SettingToggle
        checked={checkedState}
        readOnly={readOnly}
        onToggleInputChange={onToggleInputChange}
        visible={visible}
        onText={onToggleLabel}
        offText={offToggleLabel}
      />
      {checkedState ? (
        <SettingTextField
          id={textFieldId}
          value={textFieldValue}
          label={textFieldLabel}
          customLabel={customLabel}
          readOnly={readOnly}
          visible={visible}
        />
      ) : null}
    </>
  );
};
