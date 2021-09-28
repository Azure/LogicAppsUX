import React, { memo } from 'react';
import { Handle, NodeProps, Position } from 'react-flow-renderer';

const DefaultNode = ({ data, targetPosition = Position.Top, sourcePosition = Position.Bottom }: NodeProps) => {
  return (
    <>
      <div style={{ height: '38px', width: '172px', borderStyle: 'solid', textAlign: 'center' }} onClick={() => console.log(data.label)}>
        <Handle
          type="target"
          position={targetPosition}
          isConnectable={false}
          style={{ visibility: 'hidden', height: '1px', width: '1px', border: 'none' }}
        />

        <div style={{ display: 'flex', flexGrow: 1, justifyContent: 'center', alignContent: 'center', flexDirection: 'column' }}>
          <p>{data.label}</p>
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
