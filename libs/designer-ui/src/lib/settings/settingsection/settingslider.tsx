import type { SettingProps } from './settingtoggle';
import { Slider } from '@fluentui/react';
import React, { useState } from 'react';

type ValueChangeHandler = (value: number) => void;
export interface CustomValueSliderProps extends SettingProps {
  value: number;
  maxVal?: number;
  minVal?: number;
  defaultValue?: number;
  sliderLabel: string;
  onValueChange: ValueChangeHandler;
}

export const CustomValueSlider = ({
  value,
  readOnly = false,
  maxVal = 100,
  minVal = 0,
  defaultValue = (minVal + maxVal) / 2,
  customLabel,
  sliderLabel,
  visible,
  onValueChange,
}: CustomValueSliderProps): JSX.Element | null => {
  const [sliderCount, setCount] = useState(value ?? defaultValue);
  const onSliderValueChanged = (value: number): void => {
    setCount(value);
    onValueChange?.(value);
  };

  if (!visible) {
    return null;
  }

  if (customLabel) {
    return (
      <>
        {customLabel()}
        <div className="msla-setting-input">
          <Slider
            label={sliderLabel}
            ariaLabel={sliderLabel}
            disabled={readOnly}
            max={maxVal}
            min={minVal}
            showValue={true}
            value={sliderCount}
            onChange={onSliderValueChanged}
          />
        </div>
      </>
    );
  }

  return (
    <div className="msla-setting-input">
      <Slider
        label={sliderLabel}
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
  );
};
