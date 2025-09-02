import { mergeClasses } from '@fluentui/react-components';
import { Handle, Position } from '@xyflow/react';
import { useHandleStyles } from './handles.styles';

export const EdgeDrawTargetHandle = () => {
  const styles = useHandleStyles();

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, styles.top)}
      type="target"
      position={Position.Top}
      isConnectable={true}
      isConnectableStart={false}
      isConnectableEnd={true}
    />
  );
};
