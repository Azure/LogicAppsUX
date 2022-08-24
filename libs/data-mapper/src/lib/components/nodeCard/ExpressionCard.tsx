import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Icon } from '@fluentui/react';
import { Badge, Button, createFocusOutlineStyle, makeStyles, mergeClasses, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';

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
    position: 'relative',
    justifyContent: 'center',
    ...shorthands.padding('0px'),
    ...shorthands.margin(tokens.strokeWidthThick),

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

  badge: {
    position: 'absolute',
    top: '0px',
    right: '0px',
    zIndex: '1',
  },

  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export const ExpressionCard: FunctionComponent<CardProps> = ({ iconName, onClick, disabled }) => {
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  return (
    <div style={{ height: '32px', width: '32px', position: 'relative' }}>
      <Badge size="extra-small" color="danger" className={classes.badge}></Badge>
      <Button onClick={onClick} className={mergedClasses} disabled={!!disabled}>
        <Icon iconName={iconName} />
      </Button>
    </div>
  );
};
