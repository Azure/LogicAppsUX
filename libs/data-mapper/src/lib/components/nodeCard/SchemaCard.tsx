import { SchemaTypes } from '../../models';
import type { CardProps } from './NodeCard';
import { getStylesForSharedState } from './NodeCard';
import { Icon, Text } from '@fluentui/react';
import {
  Badge,
  Button,
  createFocusOutlineStyle,
  makeStyles,
  mergeClasses,
  shorthands,
  tokens,
  typographyStyles,
} from '@fluentui/react-components';
import { bundleIcon, Important12Filled, ChevronRight16Regular } from '@fluentui/react-icons';
import type { FunctionComponent } from 'react';
import { Handle, Position } from 'react-flow-renderer';

export interface SchemaCardProps {
  data: SchemaCardWrapperProps;
}

export type SchemaCardWrapperProps = {
  label: string;
  schemaType: SchemaTypes;
  displayHandle: boolean;
  isLeaf?: boolean;
} & CardProps;

const useStyles = makeStyles({
  root: {
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'flex',
    flexDirection: 'row',
    height: '48px',
    opacity: 1,
    width: '200px',
    alignItems: 'center',
    justifyContent: 'left',
    ...shorthands.gap('8px'),
    ...shorthands.margin('2px'),

    '&:hover': {
      backgroundColor: tokens.colorNeutralBackground1,
    },
    '&:active': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
  },
  badge: {
    position: 'absolute',
    top: '-7px',
    right: '-10px',
    zIndex: '1',
  },
  badgeDisabled: {
    opacity: '0.38',
  },
  cardIcon: {
    backgroundColor: tokens.colorBrandBackground2,
    width: '48px',
    borderStartStartRadius: tokens.borderRadiusMedium,
    borderEndStartRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    lineHeight: '48px',
    textAlign: 'center',
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '44px',
  },
  container: { height: '48px', width: '200px', isolation: 'isolate', position: 'relative' },
  cardText: {
    ...typographyStyles.body1Strong,
    display: 'inline-block',
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    textAlign: 'left',
    width: '112px',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    fontSize: '16px',

    justifyContent: 'right',
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
});

export const SchemaCard: FunctionComponent<SchemaCardProps> = ({ data }) => {
  return (
    <div>
      <SchemaCardWrapper
        label={data.label}
        schemaType={data.schemaType}
        displayHandle={data.displayHandle}
        isLeaf={data?.isLeaf}
        onClick={data?.onClick}
        disabled={data?.disabled}
        iconName={'12pointstar'}
        error={data.error}
      />
    </div>
  );
};

const cardInputText = makeStyles({
  cardText: {
    width: '136px',
  },
});

const handleStyle = { color: 'red' };

export const SchemaCardWrapper: FunctionComponent<SchemaCardWrapperProps> = ({
  label,
  schemaType,
  isLeaf,
  onClick,
  disabled,
  error,
  displayHandle,
}) => {
  const classes = useStyles();
  const sharedStyles = getStylesForSharedState();
  const mergedClasses = mergeClasses(sharedStyles.root, classes.root);
  const mergedInputText = mergeClasses(classes.cardText, cardInputText().cardText);
  const errorClass = mergeClasses(mergedClasses, sharedStyles.error);
  const disabledError = mergeClasses(classes.badge, classes.badgeDisabled);
  const showOutputChevron = schemaType === SchemaTypes.Output && !isLeaf;
  const ExclamationIcon = bundleIcon(Important12Filled, Important12Filled);

  return (
    <div className={classes.container}>
      {displayHandle ? (
        <Handle
          type={schemaType === SchemaTypes.Input ? 'source' : 'target'}
          position={schemaType === SchemaTypes.Input ? Position.Right : Position.Left}
          style={handleStyle}
        />
      ) : null}
      {error && <Badge size="small" icon={<ExclamationIcon />} color="danger" className={disabled ? disabledError : classes.badge}></Badge>}
      <Button className={error ? errorClass : mergedClasses} disabled={!!disabled} onClick={onClick}>
        <Icon className={classes.cardIcon} iconName="Diamond" />
        <Text className={schemaType === SchemaTypes.Output ? classes.cardText : mergedInputText} block={true} nowrap={true}>
          {label}
        </Text>
        {showOutputChevron && (
          <div className={classes.cardChevron}>
            <ChevronRight16Regular />
          </div>
        )}
      </Button>
    </div>
  );
};
