import { NodeCard } from './NodeCard';
import { Icon } from '@fluentui/react';
import { makeStyles } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

interface ExpressionCardProps {
  onClick?: () => void;
  disabled?: boolean;
}

const useStyles = makeStyles({
  root: {
    width: '24px',
    minWidth: '24px',
    height: '24px',
    backgroundColor: '#8764b8',
    color: 'white',
    textAlign: 'center',
    lineHeight: '24px',
    borderStartStartRadius: '100px',
    borderStartEndRadius: '100px',
    borderEndStartRadius: '100px',
    borderEndEndRadius: '100px',
    '&:enabled': {
      '&:hover': {
        backgroundColor: '#8764b8',
        color: 'white',
      },
    },
  },
});

export const ExpressionCard: FunctionComponent<ExpressionCardProps> = ({ onClick, disabled }) => {
  const classes = useStyles();

  return (
    <NodeCard onClick={onClick} disabled={disabled} childClasses={classes}>
      <Icon iconName="Variable" />
    </NodeCard>
  );
};
