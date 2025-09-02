import type { HandleType } from '@xyflow/react';
import { Position, Handle } from '@xyflow/react';
import { useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';

export const DefaultHandle = (props: { type: HandleType }) => {
  const styles = useHandleStyles();

  return (
    <Handle
      className={mergeClasses(styles.nodeHandle, props.type === 'source' ? styles.bottom : styles.top)}
      type={props.type}
      position={props.type === 'source' ? Position.Bottom : Position.Top}
      isConnectable={false}
    />
  );
};
