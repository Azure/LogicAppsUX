import { Label } from '../../label';
import { SettingToggle } from './settingtoggle';
import { Slider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React, { useState } from 'react';

export interface CustomValueSliderProps {
  value: number;
  readOnly?: boolean;
  maxVal?: number;
  minVal?: number;
  defaultValue?: number;
  sliderLabel: string;
  onToggleLabel: string;
  offToggleLabel: string;
}

export const CustomValueSlider = ({
  value,
  readOnly = false,
  maxVal = 100,
  minVal = 0,
  defaultValue = (minVal + maxVal) / 2,
  onToggleLabel,
  offToggleLabel,
  sliderLabel,
}: CustomValueSliderProps): JSX.Element => {
  const [checked, toggleChecked] = useBoolean(false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    toggleChecked.toggle();
  };
  const [sliderCount, setCount] = useState(value ?? defaultValue);
  const onSliderValueChanged = (value: number): void => {
    setCount(value);
  };

  return (
    <>
      <SettingToggle readOnly={readOnly} onToggleInputChange={onToggleInputChange} onLabel={onToggleLabel} offLabel={offToggleLabel} />
      {checked ? (
        <div>
          <div className="msla-operation-setting">
            <div className="msla-setting-label">
              <Label text={sliderLabel} />
            </div>
            <div className="msla-setting-input">
              <Slider
                ariaLabel={sliderLabel}
                defaultValue={defaultValue}
                disabled={readOnly}
                max={maxVal}
                min={minVal}
                showValue={true}
                value={sliderCount}
                onChange={onSliderValueChanged}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
