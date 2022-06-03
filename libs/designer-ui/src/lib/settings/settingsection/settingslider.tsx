import { Label } from '../../label';
import { SettingToggle } from './settingtoggle';
import type { SettingProps } from './settingtoggle';
import { Slider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

export interface CustomValueSliderProps extends SettingProps {
  value?: number;
  maxVal?: number;
  minVal?: number;
  defaultValue?: number;
  label?: string;
}

export const CustomValueSlider = ({
  value,
  readOnly = false,
  maxVal = 100,
  minVal = 0,
  defaultValue = (minVal + maxVal) / 2,
  customLabel,
  label,
}: CustomValueSliderProps): JSX.Element => {
  const [checked, toggleChecked] = useBoolean(false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    toggleChecked.toggle();
  };
  const [sliderCount, setCount] = useState(value ?? defaultValue);
  const onSliderValueChanged = (value: number): void => {
    setCount(value);
  };
  const intl = useIntl();
  const labelText = intl.formatMessage({
    defaultMessage: 'Label Text',
    description: 'text description for label',
  });
  const sliderAriaLabel = intl.formatMessage({
    defaultMessage: 'draggable slider bar',
    description: 'aria label for slider',
  });

  return (
    <>
      <SettingToggle readOnly={readOnly} onToggleInputChange={onToggleInputChange} />
      {checked ? (
        <div>
          <div className="msla-operation-setting">
            <div className="msla-setting-label">
              <Label text={label ?? ''} />
            </div>
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
          </div>
        </div>
      ) : null}
    </>
  );
};
