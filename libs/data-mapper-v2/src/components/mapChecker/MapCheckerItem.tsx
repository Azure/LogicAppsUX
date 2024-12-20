import { Stack } from '@fluentui/react';
import { Button, Text, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { MapCheckerEntry } from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { useMapCheckerItemStyles } from './styles';

export interface MapCheckerItemProps extends MapCheckerEntry {
  onClick: () => void;
}

export const MapCheckerItem = ({ title, description, severity, onClick }: MapCheckerItemProps) => {
  const intl = useIntl();
  const styles = useMapCheckerItemStyles();

  const icon = iconForMapCheckerSeverity(severity);

  return (
    <Button className={styles.buttonStyle} onClick={onClick}>
      <Stack
        horizontal
        tokens={{
          childrenGap: '8px',
        }}
      >
        {icon}
        <Stack
          tokens={{
            childrenGap: '4px',
          }}
        >
          <Text style={{ ...typographyStyles.body1Strong }}>{intl.formatMessage(title.message, title.value)}</Text>
          <Text style={{ ...typographyStyles.body1, wordBreak: 'break-word' }}>
            {intl.formatMessage(description.message, description.value)}
          </Text>
        </Stack>
      </Stack>
    </Button>
  );
};
