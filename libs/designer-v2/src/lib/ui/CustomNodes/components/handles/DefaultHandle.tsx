import type { HandleType } from '@xyflow/react';
import { Position, Handle } from '@xyflow/react';
import { containedHandleStyle, useHandleStyles } from './handles.styles';
import { mergeClasses } from '@fluentui/react-components';
import { NodeMergePoint } from '@microsoft/designer-ui-v2';
import { useHandlePresentation } from './useHandlePresentation';
import { useIntl } from 'react-intl';

export const DefaultHandle = (props: {
  type: HandleType;
  id?: string;
  contained?: boolean;
  presentation?: 'structural' | 'merge';
  label?: string;
}) => {
  const styles = useHandleStyles();
  const shared = useHandlePresentation();
  const intl = useIntl();
  const merge = shared && props.presentation === 'merge';
  const contained = shared && (props.contained || merge);

  const handle = (
    <Handle
      className={mergeClasses(styles.nodeHandle, contained ? styles.sharedPort : props.type === 'source' ? styles.bottom : styles.top)}
      type={props.type}
      id={props.id}
      position={props.type === 'source' ? Position.Bottom : Position.Top}
      isConnectable={false}
      style={contained ? containedHandleStyle : undefined}
      data-port-contained={contained || undefined}
    />
  );

  return merge ? (
    <NodeMergePoint
      className={styles.merge}
      label={props.label ?? ''}
      strings={{
        label: (label) =>
          intl.formatMessage(
            {
              defaultMessage: 'Merge point for {label}',
              id: 'lQswd7',
              description: 'Accessible name for a control-flow branch convergence point',
            },
            { label }
          ),
      }}
    >
      {handle}
    </NodeMergePoint>
  ) : (
    handle
  );
};
