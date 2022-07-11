import type { FunctionComponent } from 'react';
import { useCallback } from 'react';
import { Handle, Position } from 'react-flow-renderer';

const handleStyle = { left: 10 };

interface ExampleFlowCardProps {
  data: any;
}

export const ExampleFlowCard: FunctionComponent<ExampleFlowCardProps> = ({ data }) => {
  const onChange = useCallback((evt) => {
    console.log(evt.target.value);
  }, []);

  console.log('data ', data);

  return (
    <>
      <Handle type="target" position={Position.Top} />
      <div>
        <label htmlFor="text">Text:{data}</label>
        <input id="text" name="text" onChange={onChange} />
      </div>
      <Handle type="source" position={Position.Bottom} id="a" />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle} />
    </>
  );
};
