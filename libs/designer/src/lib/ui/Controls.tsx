import { useMinimap } from '../core/state/designerView/designerViewSelectors';
import { toggleMinimap } from '../core/state/designerView/designerViewSlice';
import { Icon } from '@fluentui/react';
import { ControlButton, Controls } from 'react-flow-renderer';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

const CustomControls = () => {
  const intl = useIntl();
  const dispatch = useDispatch();
  const showMinimap = useMinimap();

  const minimapToggleClick = () => {
    dispatch(toggleMinimap());
  };

  const minimapAria = intl.formatMessage({
    defaultMessage: 'Toggle Minimap',
    description: 'Turn the minimap on or off',
  });

  return (
    <Controls showInteractive={false}>
      <ControlButton aria-label={minimapAria} title={minimapAria} onClick={minimapToggleClick}>
        <Icon iconName={'Nav2DMapView'} styles={{ root: { color: showMinimap ? '#1F85FF' : '#000000' } }} />
      </ControlButton>
    </Controls>
  );
};

export default CustomControls;
