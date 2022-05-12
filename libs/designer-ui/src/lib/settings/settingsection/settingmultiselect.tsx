import { Checkbox } from '@fluentui/react';
import React from 'react';

type StatusChangeHandler = (statusKey: string, checked?: boolean) => void;

export interface MultiSelectSettingProps {
  id: string;
  selections: Record<string, boolean>;
  onSelectionChange?: StatusChangeHandler;
  onRenderLabel?(props?: MultiSelectSettingProps): JSX.Element | null;
  checkboxLabels: string[];
}

export const MultiSelectSetting: React.FC<MultiSelectSettingProps> = (props): JSX.Element => {
  const { selections, onSelectionChange, onRenderLabel, checkboxLabels } = props;
  return (
    <div className="msla-run-after-statuses">
      {checkboxLabels.map((label, index) => {
        return (
          <div className="msla-run-after-status-checkbox" key={index}>
            <Checkbox
              checked={selections[label]}
              label={label}
              onRenderLabel={onRenderLabel ? () => onRenderLabel?.(props) : undefined}
              onChange={(_, checked) => onSelectionChange?.(label, checked)}
            />
          </div>
        );
      })}
    </div>
  );
};
