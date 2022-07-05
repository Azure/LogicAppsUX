import { useMinimap } from '../core/state/designerOptions/designerOptionsSelectors';
import { toggleMinimap } from '../core/state/designerOptions/designerOptionsSlice';
import { Icon } from '@fluentui/react';
import { ControlButton, Controls } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';

const CustomControls = () => {
  const dispatch = useDispatch();
  const showMinimap = useMinimap();

  const minimapToggleClick = () => {
    console.log('CLICKED');
    dispatch(toggleMinimap());
  };

  return (
    <Controls showInteractive={false}>
      <ControlButton onClick={minimapToggleClick}>
        <Icon ariaLabel={''} iconName={'Nav2DMapView'} styles={{ root: { color: showMinimap ? '#1F85FF' : '#000000' } }} />
      </ControlButton>
    </Controls>
  );
};

export default CustomControls;
