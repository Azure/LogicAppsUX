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
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    backgroundColor: tokens.colorNeutralBackground1,
    display: 'block',
    flexDirection: 'row',
    height: '44px',
    opacity: 1,
    width: '200px',

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
    flexGrow: '0',
    flexShrink: '0',
    flexBasis: '44px',
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
    display: 'flex',
    fontSize: '16px',
    paddingRight: '8px',
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
        {schemaType === SchemaTypes.Output && !isLeaf && (
          <div className={classes.cardChevron}>
            <Icon iconName="ChevronRightMed" />
          </div>
        )}
      </NodeCard>
    </div>
  );
};
