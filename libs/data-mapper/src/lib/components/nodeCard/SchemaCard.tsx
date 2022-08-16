import { SchemaTypes } from '../../models';
import { NodeCard } from './NodeCard';
import { Icon, Text } from '@fluentui/react';
import { createFocusOutlineStyle, makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import { Handle, Position } from 'react-flow-renderer';

export interface SchemaCardProps {
  data: SchemaCardWrapperProps;
}

export interface SchemaCardWrapperProps {
  label: string;
  schemaType: SchemaTypes;
  displayHandle: boolean;
  isLeaf?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    width: '200px',
    height: '44px',
    backgroundColor: tokens.colorNeutralBackground1,
    opacity: 1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),

    '&:enabled': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
  },

  cardIcon: {
    backgroundColor: tokens.colorBrandBackground2,
    borderStartStartRadius: tokens.borderRadiusMedium,
    borderEndStartRadius: tokens.borderRadiusMedium,
    color: tokens.colorBrandForeground1,
    fontSize: '24px',
    lineHeight: '44px',
    textAlign: 'center',
    width: '44px',
  },
  cardText: {
    ...typographyStyles.body1Strong,
    alignSelf: 'center',
    color: tokens.colorNeutralForeground1,
    paddingLeft: '8px',
    paddingRight: '8px',
    textAlign: 'center',
  },
  cardChevron: {
    color: tokens.colorNeutralForeground3,
    width: '20px',
    height: '18px',
    paddingLeft: '12px',
  },

  focusIndicator: createFocusOutlineStyle({
    style: {
      outlineRadius: '5px',
    },
  }),
});

const handleStyle = { color: 'red' };

export const SchemaCard: FunctionComponent<SchemaCardProps> = ({ data }) => {
  return (
    <div>
      {/* TODO: remove handle and make a part of card clickable and drawable instead (14957766) */}
      {data.displayHandle ? (
        <Handle
          type={data.schemaType === SchemaTypes.Input ? 'source' : 'target'}
          position={data.schemaType === SchemaTypes.Input ? Position.Right : Position.Left}
          style={handleStyle}
        />
      ) : null}
      <SchemaCardWrapper
        label={data.label}
        schemaType={data.schemaType}
        displayHandle={data.displayHandle}
        isLeaf={data?.isLeaf}
        onClick={data?.onClick}
        disabled={data?.disabled}
      />
    </div>
  );
};

export const SchemaCardWrapper: FunctionComponent<SchemaCardWrapperProps> = ({ label, schemaType, isLeaf, onClick, disabled }) => {
  const classes = useStyles();

  return (
    <div>
      <NodeCard onClick={onClick} disabled={disabled} childClasses={classes}>
        <Icon className={classes.cardIcon} iconName="Diamond" />
        <Text className={classes.cardText} block={true} nowrap={true}>
          {label}
        </Text>
        <div className={classes.cardChevron}>{schemaType === SchemaTypes.Output && !isLeaf && <Icon iconName="ChevronRightMed" />}</div>
      </NodeCard>
    </div>
  );
};
