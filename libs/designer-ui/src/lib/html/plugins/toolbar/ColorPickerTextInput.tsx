import { css, useTheme } from '@fluentui/react';
import { useContext, useEffect, useRef } from 'react';
import { DropDownContext } from './helper/DropdownItems';
import constants from '../../../constants';

type Props = Readonly<{
  'data-test-id'?: string;
  label: string;
  onChange: (val: string) => void;
  placeholder?: string;
  value: string;
}>;

export function TextInput({ label, value, onChange, placeholder = '', 'data-test-id': dataTestId }: Props): JSX.Element {
  const ref = useRef<HTMLInputElement>(null);
  const { isInverted } = useTheme();

  const dropDownContext = useContext(DropDownContext);

  const { registerItem } = dropDownContext ?? {};

  useEffect(() => {
    if (registerItem && ref?.current) {
      registerItem(ref);
    }
  }, [ref, registerItem]);

  return (
    <div className="msla-colorpicker-input-wrapper">
      <label
        className="msla-colorpicker-input-label"
        style={{ color: isInverted ? constants.INVERTED_TEXT_COLOR : constants.STANDARD_TEXT_COLOR }}
      >
        {label}
      </label>
      <input
        type="text"
        className={css('msla-colorpicker-input', isInverted && 'inverted')}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        ref={ref}
        data-test-id={dataTestId}
      />
    </div>
  );
}
