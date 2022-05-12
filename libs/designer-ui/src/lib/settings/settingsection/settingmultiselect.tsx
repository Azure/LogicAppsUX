import { Checkbox } from '@fluentui/react';
import React, { useState } from 'react';

type StatusChangeHandler = (statusKey: string, checked?: boolean) => void;

interface MultiSelectOption {
  isSelected: boolean;
  label: string;
}

export interface MultiSelectSettingProps {
  id: string;
  selections: MultiSelectOption[];
  onSelectionChange?: StatusChangeHandler;
  onRenderLabel?(props?: MultiSelectSettingProps): JSX.Element | null;
}

export const MultiSelectSetting: React.FC<MultiSelectSettingProps> = (props): JSX.Element => {
  const { selections, onSelectionChange, onRenderLabel } = props;
  const [userSelections, setUserSelections] = useState(selections);
  const handleSelectionChange = (label: string, checked: boolean): void => {
    const newUserSelections = userSelections.reduce((acc, current) => {
      return current.label === label ? [...acc, { ...current, isSelected: checked }] : [...acc, current];
    }, [] as MultiSelectOption[]);
    setUserSelections(newUserSelections);
    onSelectionChange?.(label, checked);
  };
  return (
    <div className="msla-run-after-statuses">
      {userSelections.map(({ isSelected, label }, index) => {
        return (
          <div className="msla-run-after-status-checkbox" key={index}>
            <Checkbox
              checked={isSelected}
              label={label}
              onRenderLabel={onRenderLabel ? () => onRenderLabel?.(props) : undefined}
              onChange={(_, checked) => handleSelectionChange(label, !!checked)}
            />
          </div>
        );
      })}
    </div>
  );
};
