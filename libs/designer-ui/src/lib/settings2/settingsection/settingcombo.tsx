import React, { useState } from 'react';
import { TextField, Toggle } from '@fluentui/react';

export const ReactiveToggle: React.FC<any> = (value: string): JSX.Element => {
  const [checked, setChecked] = useState(false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean): void => {
    e.stopPropagation();
    e.preventDefault();
    setChecked(!checked);
  };
  return (
    <>
      <Toggle onText="Setting On" offText="Setting Off" checked={checked} ariaLabel="Toggleable Setting" onChange={onToggleInputChange} />
      {checked ? <TextField value={value} /> : null}
    </>
  );
};
