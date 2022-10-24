import { openAddSourceSchemaPanelView, openAddTargetSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch } from '../../core/state/Store';
import { SchemaType } from '../../models';
import CardOnHover from './card_onHover.svg';
import CardOnRest from './card_onRest.svg';
import { Image, Stack } from '@fluentui/react';
import { makeStyles, shorthands, tokens, typographyStyles } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch } from 'react-redux';

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
  schemaType: SchemaType;
}

export const SelectSchemaCard = ({ schemaType }: SelectSchemaCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

  const [isHovering, setIsHovering] = useState(false);

  const selectSchemaMsg = useMemo(() => {
    if (schemaType === SchemaType.Source) {
      return intl.formatMessage({
        defaultMessage: 'Add a source schema',
        description: 'label to inform to add a source schema to be used',
      });
    } else {
      return intl.formatMessage({
        defaultMessage: 'Add a target schema',
        description: 'label to inform to add a target schema to be used',
      });
    }
  }, [intl, schemaType]);

  const onClickSchemaCard = () => {
    if (schemaType === SchemaType.Source) {
      dispatch(openAddSourceSchemaPanelView());
    } else {
      dispatch(openAddTargetSchemaPanelView());
    }
  };

  return (
    <Stack
      verticalAlign="center"
      horizontalAlign="center"
      className={styles.schemaSelectCard}
      onClick={onClickSchemaCard}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <Image src={isHovering ? CardOnHover : CardOnRest} alt="Empty schema card svg" style={{ paddingBottom: '28px' }} />
      {selectSchemaMsg}
    </Stack>
  );
};
