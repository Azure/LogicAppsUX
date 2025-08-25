import { Handle, Position } from '@xyflow/react';
import { useReadOnly } from '../../../core/state/designerOptions/designerOptionsSelectors';
import { useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';

export const EdgeDrawSourceHandle = () => {
  const styles = useHandleStyles();
  const readOnly = useReadOnly();

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, styles.bottom, styles.edgeDrawStart)}
      type="source"
      position={Position.Bottom}
      isConnectable={true}
      isConnectableStart={true}
      isConnectableEnd={false}
      style={
        readOnly
          ? {
              visibility: 'hidden',
              transform: 'translate(-50%, 0)',
            }
          : {}
      }
    />
  );
};
