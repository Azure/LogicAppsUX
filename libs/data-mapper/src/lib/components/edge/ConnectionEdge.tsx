import { Button } from '@fluentui/react-components';
import { AddCircle20Regular } from '@fluentui/react-icons';
import React, { useMemo } from 'react';
import { BaseEdge, getSmoothStepPath } from 'reactflow';
import type { EdgeProps } from 'reactflow';

const addFunctionBtnSize = 32;

export const ConnectionEdge = (props: EdgeProps) => {
  const { id, data, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition } = props;

  const [edgePath, labelX, labelY] = useMemo(
    () => getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition }),
    [sourcePosition, sourceX, sourceY, targetX, targetY, targetPosition]
  );

  const onAddFunctionClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    console.log(id);
  };

  return (
    <>
      <BaseEdge path={edgePath} labelX={labelX} labelY={labelY} {...props} />

      <foreignObject
        width={addFunctionBtnSize}
        height={addFunctionBtnSize}
        x={labelX - addFunctionBtnSize / 2}
        y={labelY - addFunctionBtnSize / 2}
      >
        {data?.isHovered && <Button appearance="transparent" icon={<AddCircle20Regular />} onClick={onAddFunctionClick} />}
      </foreignObject>
    </>
  );
};
