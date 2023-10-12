import { Stack } from '@fluentui/react';
import { makeStyles, shorthands, Text, tokens, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';

const useStyles = makeStyles({
  placeholderContainer: {
    width: `240px`,
    height: `300px`,
    ...shorthands.border(tokens.strokeWidthThick, 'dashed', tokens.colorNeutralStroke1),
    ...shorthands.borderRadius(tokens.borderRadiusMedium),
  },
  placeholderText: {
    ...typographyStyles.body1Strong,
    color: tokens.colorNeutralForeground2,
    maxWidth: '80%',
    textAlign: 'center',
  },
});

export interface AddedFunctionPlaceholderProps {
  strin?: string;
}

export const AddedFunctionPlaceholder = () => {
  const intl = useIntl();
  const styles = useStyles();

  const placeholderMsgLoc = intl.formatMessage({
    defaultMessage: 'Added Functions',
    description: 'Main message displayed in the function placeholder',
  });

  return (
    <Stack
      verticalAlign="start"
      horizontalAlign="center"
      className={styles.placeholderContainer}
      style={{
        position: 'absolute',
        zIndex: 4,
        border: `${tokens.strokeWidthThick} dashed ${tokens.colorNeutralStroke1}`,
        borderRadius: tokens.borderRadiusMedium,
        background: 'transparent',
      }}
    >
      <Text className={styles.placeholderText} style={{ padding: '5px' }}>
        {placeholderMsgLoc}
      </Text>
    </Stack>
  );
};
