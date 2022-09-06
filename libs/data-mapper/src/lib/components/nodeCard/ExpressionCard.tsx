import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Icon } from '@fluentui/react';
import {
  PresenceBadge,
  Button,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  Tooltip,
  Text,
} from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import type { NodeProps } from 'react-flow-renderer';

export type ExpressionCardProps = {
  expressionName: string;
  brandColor: string;
  iconName: string;
  onClick: () => void;
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
  const { onClick, expressionName, brandColor, iconName, disabled, error } = props.data;
  const classes = useStyles();
  const mergedClasses = mergeClasses(getStylesForSharedState().root, classes.root);

  return (
    <div className={classes.container}>
      {error && <PresenceBadge size="extra-small" status="busy" className={classes.badge}></PresenceBadge>}
      <Tooltip
        content={{
          children: <Text size={200}>{expressionName}</Text>,
        }}
        relationship="label"
      >
        <Button onClick={onClick} color={brandColor} className={mergedClasses} disabled={!!disabled}>
          <Icon iconName={iconName} />
        </Button>
      </Tooltip>
    </div>
  );
};
