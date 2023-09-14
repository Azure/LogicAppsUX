import type { SettingProps } from './settingtoggle';
import { Slider, TextField } from '@fluentui/react';
import { useCallback, useState } from 'react';

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
  defaultValue = 20,
  customLabel,
  sliderLabel,
  onValueChange,
  ariaLabel,
}: CustomValueSliderProps): JSX.Element | null => {
  const [sliderValue, setSliderValue] = useState(value ?? defaultValue);
  const onSliderValueChanged = useCallback((value: number) => {
    setSliderValue(value);
    setTextValue(value.toString());
  }, []);

  const onSliderValueConfirmed = useCallback(
    (_: any, value: number, __: any) => {
      onValueChange?.(value);
    },
    [onValueChange]
  );

  const [textValue, setTextValue] = useState<string | undefined>((value ?? defaultValue).toString());
  const valTextToNumber = useCallback(
    (value: string | undefined) => {
      if (!value) return;
      let val = parseInt(value);
      if (isNaN(val)) return;
      if (val < minVal) val = minVal;
      if (val > maxVal) val = maxVal;
      return val;
    },
    [maxVal, minVal]
  );
  const onTextValueChanged = useCallback(
    (_: any, value: string | undefined) => {
      setTextValue(value);
      const newValue = valTextToNumber(value);
      if (newValue) setSliderValue(newValue);
    },
    [valTextToNumber]
  );
  const onTextValueBlur = useCallback(() => {
    const newValue = valTextToNumber(textValue) ?? defaultValue;
    onValueChange?.(newValue);
    setSliderValue(newValue);
    setTextValue(newValue.toString());
  }, [defaultValue, onValueChange, textValue, valTextToNumber]);

  return (
    <>
      {customLabel ? customLabel : null}
      <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
        <div style={{ flex: '1 1 auto' }}>
          <Slider
            label={sliderLabel}
            ariaLabel={ariaLabel}
            disabled={readOnly}
            max={maxVal}
            min={minVal}
            showValue={false}
            value={sliderValue}
            onChange={onSliderValueChanged}
            onChanged={onSliderValueConfirmed}
          />
        </div>
        <TextField
          type={'number'}
          aria-label={ariaLabel}
          onChange={onTextValueChanged}
          onBlur={onTextValueBlur}
          value={textValue}
          style={{ maxWidth: '60px' }}
        />
      </div>
    </>
  );
};
