import { Label } from '../../label';
import { RenderToggleSetting } from './settingtoggle';
import { Slider } from '@fluentui/react';
import { useBoolean } from '@fluentui/react-hooks';
import React, { useState } from 'react';
import { useIntl } from 'react-intl';

interface ConcurrencyProps {
  value: number;
  isReadOnly: boolean;
  isTrigger?: boolean;
}

export const CustomConcurrencyInputs = ({ value, isReadOnly: readOnly }: ConcurrencyProps): JSX.Element => {
  const [checked, toggleChecked] = useBoolean(false);
  const onToggleInputChange = (e: React.MouseEvent<HTMLElement>, checked?: boolean) => {
    toggleChecked.toggle();
  };
  const min = 0;
  const max = 100;
  const defaultValue = 50;
  const [concurrencyCount, setCount] = useState(value || defaultValue);
  const onConcurrencyCountChanged = (value: number): void => {
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
      <RenderToggleSetting isReadOnly={false} onToggleInputChange={onToggleInputChange} />
      {checked ? (
        <div>
          <div className="msla-operation-setting">
            <div className="msla-setting-label">
              <Label text={labelText} />
            </div>
            <div className="msla-setting-input">
              <Slider
                ariaLabel={sliderAriaLabel}
                defaultValue={defaultValue}
                disabled={readOnly}
                max={max}
                min={min}
                showValue={true}
                value={concurrencyCount}
                onChange={onConcurrencyCountChanged}
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
