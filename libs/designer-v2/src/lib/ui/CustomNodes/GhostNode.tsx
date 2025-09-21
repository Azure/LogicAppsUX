/* eslint-disable @typescript-eslint/no-empty-function */
import { memo } from 'react';
import type { NodeProps } from '@xyflow/react';
import { DefaultHandle } from './components/handles/DefaultHandle';
import { DEFAULT_NODE_SIZE } from '../../core/utils/graph';
import { tokens } from '@fluentui/react-components';

const GhostNode = ({ id }: NodeProps) => {
  return (
    <div>
      <DefaultHandle type="target" />
      <div id={`ghost-${id}`} style={{
        width: DEFAULT_NODE_SIZE.width,
        height: DEFAULT_NODE_SIZE.height,
        border: `2px dashed ${tokens.colorBrandForeground1}`,
        borderRadius: 4,
        boxSizing: 'border-box',
        backgroundColor: tokens.colorBrandBackground2Hover,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 4H10V6H6V10H4V6H0V4H4V0H6V4Z" fill={tokens.colorBrandForeground2} />
        </svg>
      </div>
      <DefaultHandle type="source" />
    </div>
  );
};

GhostNode.displayName = 'GhostNode';

export default memo(GhostNode);
