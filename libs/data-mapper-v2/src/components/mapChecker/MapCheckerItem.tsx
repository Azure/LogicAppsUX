import { Stack } from '@fluentui/react';
import { Badge, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import type { MapCheckerMessage } from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { useMapCheckerItemStyles } from './styles';
import { getTreeNodeId, isFunctionNode, isSourceNode, isTargetNode } from '../../utils/ReactFlow.Util';
import { useMemo } from 'react';

export interface MapCheckerItemProps extends MapCheckerMessage {
  _onClick?: () => void;
}

export const MapCheckerItem = ({ title, description, severity, _onClick, reactFlowId, data }: MapCheckerItemProps) => {
  const intl = useIntl();
  const styles = useMapCheckerItemStyles();

  const icon = iconForMapCheckerSeverity(severity);

  const headerText = useMemo(() => {
    const defaultTitle = intl.formatMessage(title.message, title.value);
    if (isFunctionNode(reactFlowId)) {
      return data?.functionName ?? defaultTitle;
    }
    return getTreeNodeId(reactFlowId) ?? defaultTitle;
  }, [data?.functionName, intl, reactFlowId, title.message, title.value]);

  const resources = useMemo(
    () => ({
      Source: intl.formatMessage({
        defaultMessage: 'Source',
        id: 'nODesn',
        description: 'Source',
      }),
      Target: intl.formatMessage({
        defaultMessage: 'Target',
        id: 'lfD8uQ',
        description: 'Target',
      }),
      Function: intl.formatMessage({
        defaultMessage: 'Function',
        id: 'PSrCNL',
        description: 'Function',
      }),
    }),
    [intl]
  );

  return (
    <div className={styles.buttonStyle} id={reactFlowId}>
      <Stack
        horizontal
        tokens={{
          childrenGap: '4px',
        }}
      >
        <div className={styles.headerContainer}>
          {icon}
          <Text className={styles.headerText}>{headerText}</Text>
          <Badge appearance="filled" className={styles.badge}>
            {isSourceNode(reactFlowId) ? resources.Source : isTargetNode(reactFlowId) ? resources.Target : resources.Function}
          </Badge>
        </div>
      </Stack>
      <Text className={styles.message}>{intl.formatMessage(description.message, description.value)}</Text>
    </div>
  );
};
