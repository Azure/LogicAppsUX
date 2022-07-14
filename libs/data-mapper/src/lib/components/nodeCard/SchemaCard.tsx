import { SchemaTypes } from '../configPanel/EditorConfigPanel';
import { NodeCard } from './NodeCard';
import { Icon, Text } from '@fluentui/react';
import { createFocusOutlineStyle, makeStyles, shorthands, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import { Handle, Position } from 'react-flow-renderer';

interface SchemaCardProps {
  data: SchemaCardWrapperProps;
}

interface SchemaCardWrapperProps {
  label: string;
  schemaType: SchemaTypes;
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
    ...shorthands.borderRadius('5px'),

    '&:enabled': {
      '&:hover': {
        backgroundColor: tokens.colorNeutralBackground1,
      },
    },
  },

  cardIcon: {
    backgroundColor: '#ebf3fc',
    color: '#0f6cbd',
    fontSize: '20px',
    lineHeight: '44px',
    width: '44px',
    textAlign: 'center',
  },
  cardText: {
    fontStyle: 'normal',
    fontWeight: 600,
    fontSize: '14px',
    alignSelf: 'center',
    paddingLeft: '8px',
    paddingRight: '8px',
    textAlign: 'center',
  },
  cardChevron: {
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
      <Handle type="target" position={data.schemaType === SchemaTypes.Input ? Position.Right : Position.Left} style={handleStyle} />

      <SchemaCardWrapper
        label={data.label}
        schemaType={data.schemaType}
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
        <div className={classes.cardChevron}>{schemaType === SchemaTypes.Output && isLeaf && <Icon iconName="ChevronRightMed" />}</div>
      </NodeCard>
    </div>
  );
};
