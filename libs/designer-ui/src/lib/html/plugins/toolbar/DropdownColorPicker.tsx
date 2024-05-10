import { TextInput } from './ColorPickerTextInput';
import { DropDown } from './helper/Dropdown';
import { MoveWrapper } from './helper/MoveWrapper';
import { basicColors, COLORPICKER_HEIGHT as HEIGHT, COLORPICKER_WIDTH as WIDTH } from './helper/constants';
import type { Position } from './helper/util';
import { Text } from '@fluentui/react-components';
import { capitalizeFirstLetter, transformColor } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import type { ReactNode } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';

interface DropdownColorPickerProps {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconSrc?: string;
  buttonLabel?: string;
  color: string;
  children?: ReactNode;
  onChange?: (color: string) => void;
  title?: string;
  editor: LexicalEditor;
}

export const DropdownColorPicker = ({
  editor,
  disabled,
  color,
  children,
  onChange,
  title,
  buttonIconSrc,
  ...dropdownProps
}: DropdownColorPickerProps) => {
  const [selfColor, setSelfColor] = useState(transformColor('hex', color));
  const [inputColor, setInputColor] = useState(color);
  const innerDivRef = useRef(null);

  const saturationPosition = useMemo(
    () => ({
      x: (selfColor.hsv.saturation / 100) * WIDTH,
      y: ((100 - selfColor.hsv.value) / 100) * HEIGHT,
    }),
    [selfColor.hsv.saturation, selfColor.hsv.value]
  );

  const huePosition = useMemo(
    () => ({
      x: (selfColor.hsv.hue / 360) * WIDTH,
    }),
    [selfColor.hsv]
  );

  const onSetHex = (hex: string) => {
    setInputColor(hex);
    if (/^#[0-9A-Fa-f]{6}$/i.test(hex)) {
      const newColor = transformColor('hex', hex);
      setSelfColor(newColor);
    }
  };

  const onMoveSaturation = ({ x, y }: Position) => {
    const newHsv = {
      ...selfColor.hsv,
      saturation: (x / WIDTH) * 100,
      value: 100 - (y / HEIGHT) * 100,
    };
    const newColor = transformColor('hsv', newHsv);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
  };

  const onMoveHue = ({ x }: Position) => {
    const newHsv = { ...selfColor.hsv, hue: (x / WIDTH) * 360 };
    const newColor = transformColor('hsv', newHsv);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
  };

  useEffect(() => {
    // Check if the dropdown is actually active
    if (innerDivRef.current !== null && onChange) {
      onChange(selfColor.hex);
      setInputColor(selfColor.hex);
    }
  }, [selfColor, onChange]);

  useEffect(() => {
    if (color === undefined) {
      return;
    }
    const newColor = transformColor('hex', color);
    setSelfColor(newColor);
    setInputColor(newColor.hex);
  }, [color]);

  return (
    <DropDown {...dropdownProps} disabled={disabled} stopCloseOnClickSelf buttonIconSrc={buttonIconSrc} editor={editor}>
      <div className="color-picker-wrapper" style={{ width: WIDTH }} ref={innerDivRef}>
        <Text className="color-picker-title">{capitalizeFirstLetter(title ?? '')}</Text>
        <TextInput label="Hex" onChange={onSetHex} value={inputColor} />
        <div className="color-picker-basic-color">
          {basicColors.map((basicColor) => (
            <button
              className={basicColor === selfColor.hex ? 'default-color-buttons active' : 'default-color-buttons'}
              key={basicColor}
              style={{ backgroundColor: basicColor }}
              onClick={() => {
                setInputColor(basicColor);
                setSelfColor(transformColor('hex', basicColor));
              }}
            />
          ))}
        </div>
        <MoveWrapper
          className="color-picker-saturation"
          style={{ backgroundColor: `hsl(${selfColor.hsv.hue}, 100%, 50%)` }}
          onChange={onMoveSaturation}
        >
          <div
            className="color-picker-saturation_cursor"
            style={{
              backgroundColor: selfColor.hex,
              left: saturationPosition.x,
              top: saturationPosition.y,
            }}
          />
        </MoveWrapper>
        <MoveWrapper className="color-picker-hue" onChange={onMoveHue}>
          <div
            className="color-picker-hue_cursor"
            style={{
              backgroundColor: `hsl(${selfColor.hsv.hue}, 100%, 50%)`,
              left: huePosition.x,
            }}
          />
        </MoveWrapper>
        <div className="color-picker-color" style={{ backgroundColor: selfColor.hex }} />
      </div>
      {children}
    </DropDown>
  );
};
