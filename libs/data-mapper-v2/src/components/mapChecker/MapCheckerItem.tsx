import { Stack } from '@fluentui/react';
import { Text, typographyStyles } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { MapCheckerMessage } from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { useMapCheckerItemStyles } from './styles';

export interface MapCheckerItemProps extends MapCheckerMessage {
  _onClick?: () => void;
}

export const MapCheckerItem = ({ title, description, severity, _onClick }: MapCheckerItemProps) => {
  const intl = useIntl();
  const styles = useMapCheckerItemStyles();

  const icon = iconForMapCheckerSeverity(severity);

  return (
    <div className={styles.buttonStyle}>
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
    </div>
  );
};
