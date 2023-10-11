import type { RootState } from '../../../../core/state/Store';
import { iconForMapCheckerSeverity } from '../../../../utils/Icon.Utils';
import type { IntlMessage } from '../../../../utils/Intl.Utils';
import { selectedCardStyles } from '../../../nodeCard/NodeCard';
import { Stack } from '@fluentui/react';
import { Button, Text, tokens, typographyStyles } from '@fluentui/react-components';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';

export enum MapCheckerItemSeverity {
  Error,
  Warning,
  Info,
  Unknown,
}

export interface MapCheckerEntry {
  title: IntlMessage;
  description: IntlMessage;
  severity: MapCheckerItemSeverity;
  reactFlowId: string;
}

export interface MapCheckerItemProps extends MapCheckerEntry {
  onClick: () => void;
}

export const MapCheckerItem = ({ title, description, severity, reactFlowId, onClick }: MapCheckerItemProps) => {
  const intl = useIntl();
  const selectedItemKey = useSelector((state: RootState) => state.dataMap.present.curDataMapOperation.selectedItemKey);

  const isCurrentNodeSelected = useMemo<boolean>(() => selectedItemKey === reactFlowId, [reactFlowId, selectedItemKey]);

  const icon = iconForMapCheckerSeverity(severity);

  let buttonStyle: CSSProperties = { padding: '12px', width: '100%', justifyContent: 'left', margin: '5px 0px', boxShadow: tokens.shadow4 };
  if (isCurrentNodeSelected) {
    buttonStyle = {
      ...buttonStyle,
      ...selectedCardStyles,
    };
  }

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
