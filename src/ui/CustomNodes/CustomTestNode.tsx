/* eslint-disable @typescript-eslint/no-empty-function */
import React, { memo, useState } from 'react';
import { Handle, NodeProps, Position } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';
import guid from '../../common/utilities/guid';
import { addNode, setShouldZoomToNode, triggerLayout } from '../../core/state/workflowSlice';
import { ActionButtonV2 } from '..';
import { useDrag } from 'react-dnd';
function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const [height] = useState(randomIntFromInterval(80, 100));
  const [width] = useState(randomIntFromInterval(150, 250));
  const dispatch = useDispatch();

  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    // "type" is required. It is used by the "accept" specification of drop targets.
    type: 'BOX',
    // The collect function utilizes a "monitor" instance (see the Overview for what this is)
    // to pull important pieces of state from the DnD system.
    end: (item, monitor) => {
      const dropResult = monitor.getDropResult<{ parent: string; child: string }>();
      if (item && dropResult) {
        alert(`You dropped ${id} between ${dropResult.parent} and  ${dropResult.child}!`);
      }
    },
    item: {
      id: id,
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  return (
    <div>
      <div
        ref={dragPreview}
        style={{
          height: `${height}px`,
          width: `${width}px`,
          borderStyle: 'solid',
          textAlign: 'center',
          opacity: isDragging ? 0.5 : 1,
        }}
        onClick={() => console.log(data.label)}>
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ visibility: 'hidden', height: '1px', width: '1px', border: 'none' }}
        />

        <div
          style={{
            display: 'flex',
            flexGrow: 1,
            justifyContent: 'center',
            alignContent: 'center',
            flexDirection: 'column',
          }}>
          {data.label}
          <div ref={drag} style={{ height: '10px', width: '10px', backgroundColor: 'blue' }}></div>
          {/* <Checkbox text="Check Here" descriptionText="Description Here" /> */}
        </div>

        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', height: '1px', width: '1px', border: 'none' }}
        />
      </div>

      {data?.children?.length === 0 && !isDragging && (
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', marginTop: '5px' }}>
          <ActionButtonV2
            title={'Text'}
            onClick={() => {
              const newId = guid();
              dispatch(addNode({ parentId: id, id: newId }));
              dispatch(triggerLayout());
              dispatch(setShouldZoomToNode(newId));
            }}
            trackEvent={() => {}}
          />
        </div>
      )}
    </div>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
