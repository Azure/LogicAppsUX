import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './handles/DefaultHandle';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const HiddenNode = ({ id }: NodeProps) => {
  return (
    <div>
      <DefaultHandle type="target" />
      <DefaultHandle type="source" />
    </div>
  );
};

HiddenNode.displayName = 'HiddenNode';

export default memo(HiddenNode);
