import { SchemaTypes } from '../../models';
import CardOnHover from './card_onHover.svg';
import CardOnRest from './card_onRest.svg';
import { Image } from '@fluentui/react';
import { makeStyles, shorthands, tokens } from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  schemaSelectCard: {
    width: '240px',
    height: '280px',
    backgroundColor: 'white',
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border('2px', 'solid', 'white'),
    textAlign: 'center',
    fontWeight: 'bold',
    fontSize: '16px',
    cursor: 'pointer',
    ...shorthands.margin('auto'),
    ...shorthands.padding('auto'),
    ':hover': {
      backgroundColor: '#deecf9',
      ...shorthands.borderColor('#0078d4'),
    },
  },
});

export interface SelectSchemaCardProps {
  schemaType: SchemaTypes;
  onClick: () => void;
}

const svgStyle = { paddingLeft: 70, paddingRight: 70, paddingTop: 64, paddingBottom: 28 };

export const SelectSchemaCard = ({ schemaType, onClick }: SelectSchemaCardProps) => {
  const intl = useIntl();
  const styles = useStyles();

  const [isHovering, setIsHovering] = useState(false);

  let selectSchemaMsg = '';

  switch (schemaType) {
    case SchemaTypes.Input:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Select an input schema',
        description: 'label to inform to select input schema to be used',
      });
      break;
    case SchemaTypes.Output:
      selectSchemaMsg = intl.formatMessage({
        defaultMessage: 'Select an output schema',
        description: 'label to inform to select output schema to be used',
      });
      break;
    default:
      break;
  }

  return (
    <div
      className={styles.schemaSelectCard}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Image src={isHovering ? CardOnHover : CardOnRest} style={svgStyle} alt="Empty schema card svg" />
      {selectSchemaMsg}
    </div>
  );
};
