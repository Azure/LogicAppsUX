import type { SettingProps } from './settingtoggle';
import { Slider } from '@fluentui/react';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

type ValueChangeHandler = (value: number) => void;
export interface CustomValueSliderProps extends SettingProps {
  value?: number;
  maxVal?: number;
  minVal?: number;
  defaultValue?: number;
  label?: string;
  onValueChange?: ValueChangeHandler;
}

export const CustomValueSlider = ({
  value,
  readOnly = false,
  maxVal = 100,
  minVal = 0,
  defaultValue = (minVal + maxVal) / 2,
  customLabel,
  label,
  visible,
  onValueChange,
}: CustomValueSliderProps): JSX.Element | null => {
  const [sliderCount, setCount] = useState(value ?? defaultValue);
  const onSliderValueChanged = (value: number): void => {
    setCount(value);
    onValueChange?.(value);
  };
  const intl = useIntl();
  const sliderAriaLabel = intl.formatMessage({
    defaultMessage: 'draggable slider bar',
    description: 'aria label for slider',
  });

  if (!visible) {
    return null;
  }

  if (customLabel) {
    return (
      <>
        {customLabel()}
        <div className="msla-setting-input">
          <Slider
            label={label}
            ariaLabel={sliderAriaLabel}
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
        label={label}
        ariaLabel={sliderAriaLabel}
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
