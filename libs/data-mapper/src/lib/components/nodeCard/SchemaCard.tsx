import { SchemaTypes } from '../configPanel/EditorConfigPanel';
import { NodeCard } from './NodeCard';
import { Icon, Text } from '@fluentui/react';
import { makeStyles, tokens } from '@fluentui/react-components';
import type { FunctionComponent } from 'react';
import { useIntl } from 'react-intl';

interface SchemaCardProps {
  schemaType: SchemaTypes;
  isLeaf?: boolean;
  onClick?: () => void;
  disabled?: boolean;
}

const useStyles = makeStyles({
  root: {
    display: 'flex',
    flexDirection: 'row',
    width: '100%',
    height: '44px',
    backgroundColor: tokens.colorNeutralBackground1,
    opacity: 1,

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
});

export const SchemaCard: FunctionComponent<SchemaCardProps> = ({ schemaType, onClick, isLeaf, disabled }) => {
  const intl = useIntl();

  const classes = useStyles();

  let selectSchemaMsg = '';

  switch (schemaType) {
    case SchemaTypes.Input:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Input Schema Name',
        description: 'label text displaying the name of the name of the current node',
      });
      break;
    case SchemaTypes.Output:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Output Schema Name',
        description: 'label text displaying the name of the name of the current node',
      });
      break;
    default:
      break;
  }

  return (
    <NodeCard onClick={onClick} disabled={disabled} childClasses={classes}>
      <Icon className={classes.cardIcon} iconName="Diamond" />
      <Text className={classes.cardText} block={true} nowrap={true}>
        {selectSchemaMsg}
      </Text>
      <div className={classes.cardChevron}>{isLeaf && <Icon iconName="ChevronRightMed" />}</div>
    </NodeCard>
  );
};
