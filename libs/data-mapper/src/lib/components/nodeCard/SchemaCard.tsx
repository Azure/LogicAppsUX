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
import { Handle, Position } from 'react-flow-renderer';

export interface SchemaCardProps {
  props: SchemaCardWrapperProps;
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

    '&:disabled': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },

    '&:enabled': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
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

const handleStyle = { color: 'red' };

export const SchemaCard: FunctionComponent<SchemaCardProps> = ({ props }) => {
  return (
    <div>
      {/* TODO: remove handle and make a part of card clickable and drawable instead (14957766) */}
      {props.displayHandle ? (
        <Handle
          type={props.schemaType === SchemaTypes.Input ? 'source' : 'target'}
          position={props.schemaType === SchemaTypes.Input ? Position.Right : Position.Left}
          style={handleStyle}
        />
      ) : null}
      <SchemaCardWrapper
        label={props.label}
        schemaType={props.schemaType}
        displayHandle={props.displayHandle}
        isLeaf={props?.isLeaf}
        onClick={props?.onClick}
        disabled={props?.disabled}
        iconName={'12pointstar'}
        error={true}
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
  // style={{height: "44px", width: "200px", paddingTop: '2px', paddingRight: "2px", position: "relative"}}
  return (
    <div style={{ height: '48px', width: '204px', paddingTop: '2px', paddingRight: '2px', position: 'relative' }}>
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
