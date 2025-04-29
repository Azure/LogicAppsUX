import { Button } from '@fluentui/react-components';
import { EdgeLabelRenderer, useOnViewportChange } from '@xyflow/react';
import { ArrowRepeatAllFilled, SettingsFilled } from '@fluentui/react-icons';
import { useCallback, useState } from 'react';

import { openPanel } from '../../core';
import { useDispatch } from 'react-redux';
import { setSelectedPanelActiveTab, setSelectedTransitionTarget } from '../../core/state/panel/panelSlice';

interface LoopbackEdgeContentProps {
  x: number;
  y: number;
  graphId: string;
  parentId: string;
  childId: string;
  tabIndex?: number;
  isInfinite?: boolean;
}

export const LoopbackEdgeContent = (props: LoopbackEdgeContentProps) => {
  const { parentId, childId, isInfinite } = props;

  const [popoverOpen, setPopoverOpen] = useState(false);
  useOnViewportChange({
    onStart: useCallback(() => popoverOpen && setPopoverOpen?.(false), [popoverOpen]),
  });

  const dispatch = useDispatch();

  const openTransitionsCallback = useCallback(() => {
    dispatch(
      openPanel({
        focusReturnElementId: parentId,
        nodeId: parentId,
        panelMode: 'Operation',
      })
    );
    dispatch(setSelectedPanelActiveTab('TRANSITIONS'));
    dispatch(setSelectedTransitionTarget(childId));
  }, [dispatch, parentId, childId]);

  return (
    <EdgeLabelRenderer>
      <div
        style={{
          position: 'absolute',
          left: props.x - 12,
          top: props.y - 12,
          pointerEvents: 'all',
          zIndex: 100,
          borderRadius: 4,
          background: isInfinite ? 'red' : '#b1b1b7',
        }}
      >
        <Button
          icon={isInfinite ? <ArrowRepeatAllFilled color="white" /> : <SettingsFilled color="white" />}
          size="small"
          shape="circular"
          appearance={'transparent'}
          onClick={openTransitionsCallback}
        />
      </div>
    </EdgeLabelRenderer>
  );
};

export default LoopbackEdgeContent;
