import { Button, Popover, PopoverTrigger, PopoverSurface, SwatchPicker, ColorSwatch, tokens } from '@fluentui/react-components';
import type { AppDispatch } from '../../../core';
import { useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { updateNote } from '../../../core/state/notes/notesSlice';
import { memo, useCallback } from 'react';
import { useDispatch } from 'react-redux';

import { bundleIcon, ColorFilled, ColorRegular } from '@fluentui/react-icons';

const ColorIcon = bundleIcon(ColorFilled, ColorRegular);

const ColorButton = ({ id, selectedColor }: any) => {
  const dispatch = useDispatch<AppDispatch>();
  const isReadOnly = useReadOnly();
  const colorSelectCallback = useCallback(
    (_: any, e: any) => {
      if (isReadOnly) {
        return;
      }
      dispatch(updateNote({ id, note: { color: e.selectedValue } }));
    },
    [dispatch, id, isReadOnly]
  );

  const swatchColors = [
    '#FFFBCC', // Yellow
    '#CCE5FF', // Blue
    '#CCFFCC', // Green
    '#FFCCCC', // Red
    '#E0CCFF', // Purple
    '#FFFFFF', // White
  ];

  return (
    <Popover withArrow size="small" positioning="after">
      <PopoverTrigger>
        <Button icon={<ColorIcon />} appearance="transparent" size="small" />
      </PopoverTrigger>
      <PopoverSurface>
        <SwatchPicker shape="rounded" selectedValue={selectedColor} onSelectionChange={colorSelectCallback}>
          {swatchColors.map((color) => (
            <ColorSwatch key={color} color={color} value={color} borderColor={tokens.colorNeutralStroke1} />
          ))}
        </SwatchPicker>
      </PopoverSurface>
    </Popover>
  );
};

ColorButton.displayName = 'ColorButton';

export default memo(ColorButton);
