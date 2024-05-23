import { useTheme } from '@fluentui/react';
import { TextInput } from './ColorPickerTextInput';
import { DropDown } from './helper/Dropdown';
import { MoveWrapper } from './helper/MoveWrapper';
import { basicColors, COLORPICKER_HEIGHT as HEIGHT, COLORPICKER_WIDTH as WIDTH } from './helper/constants';
import type { Position } from './helper/util';
import { Text, useArrowNavigationGroup } from '@fluentui/react-components';
import { transformColor } from '@microsoft/logic-apps-shared';
import type { LexicalEditor } from 'lexical';
import { useEffect, useMemo, useRef, useState } from 'react';
import constants from '../../../constants';
import { useDebouncedState } from '@react-hookz/web';

interface DropdownColorPickerProps {
  disabled?: boolean;
  buttonAriaLabel?: string;
  buttonClassName: string;
  buttonIconSrc?: string;
  buttonLabel?: string;
  color: string;
  onChange: (color: string) => void;
  title?: string;
  editor: LexicalEditor;
}

export const DropdownColorPicker = ({
  editor,
  disabled,
  color,
  onChange,
  title,
  buttonIconSrc,
  ...dropdownProps
}: DropdownColorPickerProps) => {
  const { isInverted } = useTheme();
  const [selfColor, setSelfColor] = useState(transformColor('hex', color));
  const [inputColor, setInputColor] = useState(color);
  const [exposedColor, setExposedColor] = useDebouncedState(selfColor, 300);
  const innerDivRef = useRef(null);

  const arrowNavigationAttributes = useArrowNavigationGroup({ axis: 'horizontal', circular: true });

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
    if (innerDivRef.current !== null) {
      if (exposedColor.hex !== selfColor.hex) {
        setExposedColor(selfColor);
      }
      setInputColor(selfColor.hex);
    }
  }, [exposedColor, selfColor, setExposedColor]);

  useEffect(() => {
    onChange(exposedColor.hex);
  }, [exposedColor, onChange]);

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
        <Text className="color-picker-title" style={{ color: isInverted ? constants.INVERTED_TEXT_COLOR : constants.STANDARD_TEXT_COLOR }}>
          {title}
        </Text>
        <TextInput label="Hex" onChange={onSetHex} value={inputColor} />
        <div className="color-picker-basic-color" {...arrowNavigationAttributes}>
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
          value={saturationPosition}
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
        <MoveWrapper className="color-picker-hue" onChange={onMoveHue} value={{ ...huePosition, y: 0 }}>
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
    </DropDown>
  );
};
