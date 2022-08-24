import { useStylesForSharedState } from './NodeCard';
import { Icon } from '@fluentui/react';
import { Button, createFocusOutlineStyle, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

export interface ExpressionCardProps {
  iconName: string;
  onClick?: () => void;
  disabled: boolean;
}

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusCircular),
    backgroundColor: '#8764b8',
    color: tokens.colorNeutralForegroundInverted,
    fontSize: '20px',
    height: '32px',
    textAlign: 'center',
    width: '32px',
    minWidth: '32px',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin('2px'),

    '&:disabled': {
      '&:hover': {
        backgroundColor: '#8764b8',
        color: tokens.colorNeutralForegroundInverted,
      },
    },

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

export const ExpressionCard: FunctionComponent<ExpressionCardProps> = ({ iconName, onClick, disabled }) => {
  const classes = useStyles();
  const mergedClasses = mergeClasses(useStylesForSharedState().root, classes.root);

  return (
    <Button onClick={onClick} className={mergedClasses} disabled={!!disabled}>
      <Icon iconName={iconName} />
    </Button>
  );
};
