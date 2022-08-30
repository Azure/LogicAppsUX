import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Icon } from '@fluentui/react';
import { Button, createFocusOutlineStyle, makeStyles, mergeClasses, PresenceBadge, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import type { NodeProps } from 'react-flow-renderer';

export type ExpressionCardProps = {
  //expressionDataType: ExpressionNodeDataType; TODO Once we have the manifest to implement the types
} & CardProps;

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
    top: '1px',
    right: '-2px',
    zIndex: '1',
  },

  container: {
    height: '32px',
    width: '32px',
    position: 'relative',
  },

  focusIndicator: createFocusOutlineStyle({
    selector: 'focus-within',
    style: {
      outlineRadius: '100px',
    },
  }),
});

export const ExpressionCard: FunctionComponent<NodeProps<ExpressionCardProps>> = (props: NodeProps<ExpressionCardProps>) => {
  const { onClick, disabled, error } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  return (
    <div className={classes.container}>
      {error && <PresenceBadge size="extra-small" status="busy" className={classes.badge}></PresenceBadge>}
      <Button onClick={onClick} className={mergedClasses} disabled={!!disabled}>
        <Icon iconName={'Diamond'} />
      </Button>
    </div>
  );
};
