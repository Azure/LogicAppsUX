import type { SettingProps } from './settingtoggle';
import { Checkbox } from '@fluentui/react';
import React, { useState } from 'react';

type StatusChangeHandler = (selections: MultiSelectOption[]) => void;

export interface MultiSelectOption {
  label: string;
  value: string;
}

export interface MultiSelectSettingProps extends SettingProps {
  options: MultiSelectOption[];
  selections: MultiSelectOption[];
  readOnly?: boolean;
  onSelectionChange?: StatusChangeHandler;
}

export const MultiSelectSetting: React.FC<MultiSelectSettingProps> = ({
  readOnly,
  options,
  selections,
  onSelectionChange,
  customLabel,
}: MultiSelectSettingProps): JSX.Element => {
  const [userSelections, setUserSelections] = useState(selections);
  const handleSelectionChange = (selection: MultiSelectOption, checked: boolean): void => {
    setUserSelections(checked ? [...userSelections, selection] : userSelections.filter((item) => item !== selection));
    onSelectionChange?.(userSelections); //this is where caller handles any side effects i.e. store update based on component state
  };
  return (
    <div className="msla-run-after-statuses">
      {options.map((option, index) => {
        return (
          <div className="msla-run-after-status-checkbox" key={index}>
            <Checkbox
              disabled={readOnly}
              checked={userSelections.includes(option)}
              label={option.label}
              onRenderLabel={customLabel}
              onChange={(_, checked) => handleSelectionChange(option, !!checked)}
            />
          </div>
        );
      })}
    </div>
  );
};
