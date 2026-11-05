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
  axis?: 'vertical' | 'horizontal';
}) => {
  const styles = useHandleStyles();
  const shared = useHandlePresentation();
  const intl = useIntl();
  const merge = shared && props.presentation === 'merge';
  const horizontal = props.axis === 'horizontal';
  const contained = shared && (props.contained || merge);

  const handle = (
    <Handle
      className={mergeClasses(
        styles.nodeHandle,
        contained
          ? styles.sharedPort
          : shared && props.type === 'source'
            ? horizontal
              ? styles.sharedSourceHorizontal
              : styles.sharedSource
            : horizontal
              ? props.type === 'source'
                ? styles.right
                : styles.left
              : props.type === 'source'
                ? styles.bottom
                : styles.top
      )}
      type={props.type}
      id={props.id}
      position={
        horizontal ? (props.type === 'source' ? Position.Right : Position.Left) : props.type === 'source' ? Position.Bottom : Position.Top
      }
      isConnectable={false}
      style={contained ? containedHandleStyle : undefined}
      data-port-contained={contained || undefined}
    />
  );

  return merge ? (
    <NodeMergePoint
      className={mergeClasses(styles.merge, horizontal && styles.mergeHorizontal)}
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
