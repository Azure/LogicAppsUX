import { SchemaTypes } from '../../models';
import CardOnHover from './card_onHover.svg';
import CardOnRest from './card_onRest.svg';
import { Image, Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { useState } from 'react';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  schemaSelectCard: {
    width: '200px',
    height: '260px',
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
    ...shorthands.border(tokens.strokeWidthThick, 'solid', tokens.colorNeutralBackground1),
    ...typographyStyles.body1Strong,
    cursor: 'pointer',
    ...shorthands.margin('auto'),
    ':hover': {
      backgroundColor: tokens.colorBrandBackground2,
      ...shorthands.border(tokens.strokeWidthThick, 'solid', tokens.colorBrandStroke1),
    },
  },
});

export interface SelectSchemaCardProps {
  schemaType: SchemaTypes;
  onClick: () => void;
}

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
    <Stack
      verticalAlign="center"
      horizontalAlign="center"
      className={styles.schemaSelectCard}
      onClick={onClick}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Image src={isHovering ? CardOnHover : CardOnRest} alt="Empty schema card svg" style={{ paddingBottom: '28px' }} />
      {selectSchemaMsg}
    </Stack>
  );
};
