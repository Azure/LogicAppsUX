import { openAddSourceSchemaPanelView, openAddTargetSchemaPanelView } from '../../core/state/PanelSlice';
import type { AppDispatch, RootState } from '../../core/state/Store';
import { LogCategory, LogService } from '../../utils/Logging.Utils';
import CardOnHover from './card_onHover.svg';
import CardOnHoverDark from './card_onHover_dark.svg';
import CardOnRest from './card_onRest.svg';
import CardOnRestDark from './card_onRest_dark.svg';
import { Image, Stack } from '@fluentui/react';
import { Button, makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { SchemaType } from '@microsoft/logic-apps-shared';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useDispatch, useSelector } from 'react-redux';

export const selectSchemaCardHeight = 260;
export const selectSchemaCardWidth = 200;

const useStyles = makeStyles({
  selectSchemaCard: {
    width: `${selectSchemaCardWidth}px`,
    height: `${selectSchemaCardHeight}px`,
    zIndex: 10,
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
  selectSchemaText: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground1,
  },
});

export interface SelectSchemaCardProps {
  schemaType: SchemaType;
  style?: React.CSSProperties;
}

export const SelectSchemaCard = ({ schemaType, style }: SelectSchemaCardProps) => {
  const intl = useIntl();
  const styles = useStyles();
  const dispatch = useDispatch<AppDispatch>();

  const currentTheme = useSelector((state: RootState) => state.app.theme);

  const [isHovering, setIsHovering] = useState(false);

  const selectSchemaMsg = useMemo(() => {
    if (schemaType === SchemaType.Source) {
      return intl.formatMessage({
        defaultMessage: 'Add a source schema',
        id: 'jQjteB',
        description: 'label to inform to add a source schema to be used',
      });
    }
    return intl.formatMessage({
      defaultMessage: 'Add a target schema',
      id: 'IXy91L',
      description: 'label to inform to add a target schema to be used',
    });
  }, [intl, schemaType]);

  const [cardOnRestSvg, cardOnHoverSvg] = useMemo(() => {
    if (currentTheme === 'dark') {
      return [CardOnRestDark, CardOnHoverDark];
    }
    return [CardOnRest, CardOnHover];
  }, [currentTheme]);

  const onClickSchemaCard = () => {
    if (schemaType === SchemaType.Source) {
      dispatch(openAddSourceSchemaPanelView());
    } else {
      dispatch(openAddTargetSchemaPanelView());
    }

    LogService.log(LogCategory.AddOrUpdateSchemaView, 'clickSchemaSelectionCard', {
      message: `Clicked to add ${schemaType} schema`,
    });
  };

  return (
    <Button appearance="transparent" onClick={onClickSchemaCard} style={{ padding: 0 }} aria-label={selectSchemaMsg}>
      <Stack
        verticalAlign="center"
        horizontalAlign="center"
        className={styles.selectSchemaCard}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        style={style}
      >
        <Image src={isHovering ? cardOnHoverSvg : cardOnRestSvg} alt="Schema selection card" style={{ paddingBottom: '28px' }} />

        <Text className={styles.selectSchemaText}>{selectSchemaMsg}</Text>
      </Stack>
    </Button>
  );
};
