import { Stack } from '@fluentui/react';
import { Badge, mergeClasses, Text } from '@fluentui/react-components';
import { useIntl } from 'react-intl';
import { MapCheckerItemSeverity, type MapCheckerMessage } from '../../utils/MapChecker.Utils';
import { iconForMapCheckerSeverity } from '../../utils/Icon.Utils';
import { useMapCheckerItemStyles } from './styles';
import { getTreeNodeId, isFunctionNode, isSourceNode, isTargetNode } from '../../utils/ReactFlow.Util';
import { useMemo } from 'react';
import { equals } from '@microsoft/logic-apps-shared';

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
    const treeNodeId = getTreeNodeId(reactFlowId);
    const splitIds = treeNodeId.split('/');
    return splitIds.length > 0 ? splitIds[splitIds.length - 1] : defaultTitle;
  }, [data?.functionName, intl, reactFlowId, title.message, title.value]);

  const pathText = useMemo(() => {
    if (isFunctionNode(reactFlowId)) {
      return '';
    }

    return getTreeNodeId(reactFlowId);
  }, [reactFlowId]);

  const resources = useMemo(
    () => ({
      Source: intl.formatMessage({
        defaultMessage: 'Source',
        id: 'ms9ce0deb2701a',
        description: 'Source',
      }),
      Target: intl.formatMessage({
        defaultMessage: 'Destination',
        id: 'ms11710bda31cc',
        description: 'Destination',
      }),
      Function: intl.formatMessage({
        defaultMessage: 'Function',
        id: 'ms3d2ac234bb64',
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
          <Badge
            appearance="filled"
            className={mergeClasses(
              styles.badge,
              equals(severity, MapCheckerItemSeverity.Error)
                ? styles.errorBadge
                : equals(severity, MapCheckerItemSeverity.Warning)
                  ? styles.warningBadge
                  : ''
            )}
          >
            {isSourceNode(reactFlowId) ? resources.Source : isTargetNode(reactFlowId) ? resources.Target : resources.Function}
          </Badge>
        </div>
      </Stack>
      <Text className={styles.message}>{intl.formatMessage(description.message, description.value ?? '')}</Text>
      <Text className={styles.subtitleText}>{pathText}</Text>
    </div>
  );
};
