import type { SettingProps } from './settingtoggle';
import { Slider } from '@fluentui/react';
import React, { useCallback, useState } from 'react';

export type ValueChangeHandler = (value: number) => void;
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
  onValueChange,
}: CustomValueSliderProps): JSX.Element | null => {
  const [sliderCount, setCount] = useState(value ?? defaultValue);
  const onSliderValueChanged = useCallback((value: number) => {
    setCount(value);
  }, []);

  const onValueConfirmed = useCallback(
    (_: any, value: number, __: any) => {
      onValueChange?.(value);
    },
    [onValueChange]
  );

  return (
    <>
      {customLabel && customLabel()}
      <div style={{ width: '100%' }}>
        <Slider
          label={sliderLabel}
          ariaLabel={sliderLabel}
          disabled={readOnly}
          max={maxVal}
          min={minVal}
          showValue={true}
          value={sliderCount}
          onChange={onSliderValueChanged}
          onChanged={onValueConfirmed}
        />
      </div>
    </>
  );
};
