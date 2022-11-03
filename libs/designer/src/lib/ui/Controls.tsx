import { useShowMinimap } from '../core/state/designerView/designerViewSelectors';
import { toggleMinimap } from '../core/state/designerView/designerViewSlice';
import { Icon, useTheme } from '@fluentui/react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';
import { ControlButton, Controls } from 'reactflow';

const CustomControls = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const showMinimap = useShowMinimap();
  const { isInverted } = useTheme();

  const minimapToggleClick = () => {
    dispatch(toggleMinimap());
  };

  const minimapAria = intl.formatMessage({
    defaultMessage: 'Toggle Minimap',
    description: 'Turn the minimap on or off',
  });

  const iconStyles = { root: { color: showMinimap ? '#1F85FF' : isInverted ? '#FFFFFF' : '#000000' } };

  return (
    <Controls showInteractive={false}>
      <ControlButton aria-label={minimapAria} title={minimapAria} onClick={minimapToggleClick}>
        <Icon iconName={'Nav2DMapView'} styles={iconStyles} />
      </ControlButton>
    </Controls>
  );
};

export default CustomControls;
