import { NodeCard } from './NodeCard';
import { Icon } from '@fluentui/react';
import { createFocusOutlineStyle, makeStyles, shorthands } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

export interface ExpressionCardProps {
  iconName: string;
  onClick?: () => void;
  disabled?: boolean;
}

const useStyles = makeStyles({
  root: {
    width: '32px',
    minWidth: '32px',
    height: '32px',
    backgroundColor: '#8764b8',
    color: 'white',
    textAlign: 'center',
    lineHeight: '24px',
    ...shorthands.borderRadius('100px'),

    '&:enabled': {
      '&:hover': {
        backgroundColor: '#8764b8',
        color: 'white',
      },
      '&:focus': {
        backgroundColor: '#8764b8',
        color: 'white',
      },
    },
  },

  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export const ExpressionCard: FunctionComponent<ExpressionCardProps> = ({ iconName, onClick }) => {
  const classes = useStyles();

  return (
    <NodeCard onClick={onClick} childClasses={classes}>
      <Icon iconName={iconName} />
    </NodeCard>
  );
};
