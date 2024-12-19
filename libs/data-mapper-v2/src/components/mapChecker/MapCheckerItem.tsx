import { Stack } from '@fluentui/react';
import { Button, Text, tokens, typographyStyles } from '@fluentui/react-components';
import type { CSSProperties } from 'react';

import { useIntl } from 'react-intl';
import type { MapCheckerEntry } from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';

export interface MapCheckerItemProps extends MapCheckerEntry {
  onClick: () => void;
}

export const MapCheckerItem = ({ title, description, severity, reactFlowId, onClick }: MapCheckerItemProps) => {
  const intl = useIntl();
  console.log(reactFlowId);
  //const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);

  // const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

  const icon = iconForMapCheckerSeverity(severity);

  const buttonStyle: CSSProperties = {
    padding: '12px',
    width: '100%',
    justifyContent: 'left',
    margin: '5px 0px',
    boxShadow: tokens.shadow4,
  };
  //   if (isCurrentNodeSelected) {
  //     buttonStyle = {
  //       ...buttonStyle,
  //       ...selectedCardStyles,
  //     };
  //   }

  return (
    <Button style={buttonStyle} onClick={onClick}>
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
