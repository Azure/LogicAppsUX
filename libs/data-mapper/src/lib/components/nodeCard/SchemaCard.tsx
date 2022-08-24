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
import type { FunctionComponent } from 'react';

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
    display: 'block',
    flexDirection: 'row',
    height: '44px',
    opacity: 1,
    width: '200px',
    textAlign: 'left',
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
    top: '0px',
    right: '-2px',
    zIndex: '1',
  },
  cardIcon: {
    backgroundColor: tokens.colorBrandBackground2,
    width: '48px',
    borderStartStartRadius: tokens.borderRadiusMedium,
    borderEndStartRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    lineHeight: '44px',
    textAlign: 'center',
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '44px',
  },
  container: { height: '48px', width: '204px', paddingTop: '2px', paddingRight: '2px', position: 'relative' },
  cardText: {
    ...typographyStyles.body1Strong,
    display: 'inline-block',
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    paddingLeft: '8px',
    paddingRight: '8px',
    textAlign: 'left',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    display: 'flex',
    fontSize: '16px',
    float: 'right',
    marginTop: '12px',
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

export const SchemaCardWrapper: FunctionComponent<SchemaCardWrapperProps> = ({ label, schemaType, isLeaf, onClick, disabled, error }) => {
  const classes = useStyles();
  const sharedStyles = getStylesForSharedState();
  const mergedClasses = mergeClasses(sharedStyles.root, classes.root);
  const errorClass = mergeClasses(mergedClasses, sharedStyles.error);
  const showOutputChevron = schemaType === SchemaTypes.Output && !isLeaf;
  return (
    <div className={classes.container}>
      {error && <Badge size="extra-small" color="danger" className={classes.badge}></Badge>}
      <Button className={error ? errorClass : mergedClasses} disabled={!!disabled} onClick={onClick}>
        <Icon className={classes.cardIcon} iconName="Diamond" />
        <Text className={classes.cardText} block={true} nowrap={true}>
          {label}
        </Text>
        {showOutputChevron && (
          <div className={classes.cardChevron}>
            <Icon iconName="ChevronRightMed" />
          </div>
        )}
      </Button>
    </div>
  );
};
