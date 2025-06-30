import { Handle, Position } from '@xyflow/react';
import { useReadOnly, useShowEdgeDrawing } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';

export const EdgeDrawSourceHandle = () => {
  const styles = useHandleStyles();
  const readOnly = useReadOnly();
  const showEdgeDrawing = useShowEdgeDrawing();

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, styles.bottom, styles.edgeDrawStart)}
      type="source"
      position={Position.Bottom}
      isConnectable={true}
      isConnectableStart={true}
      isConnectableEnd={false}
      style={
        readOnly || !showEdgeDrawing
          ? {
              visibility: 'hidden',
              transform: 'translate(-50%, 0)',
            }
          : {}
      }
    />
  );
};
