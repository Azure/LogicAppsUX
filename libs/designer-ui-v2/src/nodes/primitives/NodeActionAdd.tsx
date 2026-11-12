import { forwardRef } from 'react';
import type { HTMLAttributes } from 'react';
import { makeStyles, mergeClasses } from '@fluentui/react-components';
import { defaultNodeStrings } from '../strings';
import { NodeAddButton } from './NodeAddButton';
import { NodeHandle } from './NodeHandle';
import { NodeLine } from './NodeLine';
const useStyles = makeStyles({
  root: { display: 'inline-flex', alignItems: 'center' },
});
export interface NodeActionAddProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> {
  label?: string;
  onClick?: () => void;
  disabled?: boolean;
}
export const NodeActionAdd = forwardRef<HTMLSpanElement, NodeActionAddProps>(function NodeActionAdd(
  { label = defaultNodeStrings.addAction, onClick, disabled, className, ...rest },
  ref
) {
  const styles = useStyles();
  return (
    <span {...rest} ref={ref} className={mergeClasses(styles.root, className)}>
      <NodeHandle />
      <NodeLine variant="dashedNeutral" length={85} />
      <NodeAddButton label={label} onClick={onClick ? () => onClick() : undefined} disabled={disabled || !onClick} />
    </span>
  );
});
