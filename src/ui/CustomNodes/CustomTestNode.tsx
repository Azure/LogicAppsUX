/* eslint-disable @typescript-eslint/no-empty-function */
import React, { memo, useState } from 'react';
import { Handle, NodeProps, Position } from 'react-flow-renderer';
import { useDispatch } from 'react-redux';
import guid from '../../common/utilities/guid';
import { addNode, setShouldZoomToNode, triggerLayout } from '../../core/state/workflowSlice';
import { ActionButtonV2 } from '..';
function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom, id }: NodeProps) => {
  const [height] = useState(randomIntFromInterval(80, 100));
  const [width] = useState(randomIntFromInterval(150, 250));
  const dispatch = useDispatch();
  return (
    <>
      <div
        style={{
          height: `${height}px`,
          width: `${width}px`,
          borderStyle: 'solid',
          textAlign: 'center',
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
          {/* <Checkbox text="Check Here" descriptionText="Description Here" /> */}
        </div>

        <Handle
          type="source"
          position={sourcePosition}
          isConnectable={false}
          style={{ visibility: 'hidden', height: '1px', width: '1px', border: 'none' }}
        />
      </div>

      {data?.children?.length === 0 && (
        <div style={{ display: 'grid', placeItems: 'center', width: '100%', height: '100%', marginTop: '5px' }}>
          <ActionButtonV2
            title={'Text'}
            onClick={() => {
              const newId = guid();
              dispatch(addNode({ parentId: id, id: newId }));
              dispatch(triggerLayout());
              dispatch(setShouldZoomToNode(newId))
            }}
            trackEvent={() => {}}
          />
        </div>
      )}
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
