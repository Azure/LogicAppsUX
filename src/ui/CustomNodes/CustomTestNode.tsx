import React, { memo, useState } from 'react';
import { Handle, NodeProps, Position } from 'react-flow-renderer';
function randomIntFromInterval(min: number, max: number) {
  // min and max included
  return Math.floor(Math.random() * (max - min + 1) + min);
}
const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom }: NodeProps) => {
  const [height] = useState(randomIntFromInterval(20, 100));
  const [width] = useState(randomIntFromInterval(100, 200));
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
    </>
  );
};

DefaultNode.displayName = 'DefaultNode';

export default memo(DefaultNode);
