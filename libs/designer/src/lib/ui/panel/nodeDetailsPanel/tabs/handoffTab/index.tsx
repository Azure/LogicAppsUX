import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { Text, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import constants from '../../../../../common/constants';
import { useHandoffActionsForAgent, useIsDisconnected } from '../../../../../core/state/workflow/workflowSelectors';
import { useReadOnly } from '../../../../../core/state/designerOptions/designerOptionsSelectors';
import { useHandoffTabStyles } from './handoffTab.styles';
import { HandoffToolEntry } from './HandoffToolEntry';
import { HandoffSelector } from './HandoffSelector';

export const HandoffTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const intl = useIntl();
  const readOnly = useReadOnly();

  const intlText = useMemo(
    () => ({
      handoffDescription: intl.formatMessage({
        defaultMessage:
          'Handoffs define which agents can receive control of the workflow. Add descriptions to help agents understand the purpose of the handoff.',
        id: '2LtWMp',
        description: 'Description of handoffs',
      }),
      noHandoffWarning: intl.formatMessage({
        defaultMessage: 'Agent is unreachable in flow structure',
        id: 'gvo1S7',
        description: 'Warning message when agent is disconnected from the flow',
      }),
    }),
    [intl]
  );

  const handoffActions = useHandoffActionsForAgent(selectedNodeId);

  const isDisconnected = useIsDisconnected(selectedNodeId);

  const styles = useHandoffTabStyles();

  return (
    <div className={styles.handoffEntryContainer}>
      <MessageBar intent="info" layout="multiline">
        <MessageBarBody>
          <Text>{intlText.handoffDescription}</Text>
        </MessageBarBody>
      </MessageBar>
      {isDisconnected && (
        <MessageBar intent="warning" layout="multiline">
          <MessageBarBody>
            <Text>{intlText.noHandoffWarning}</Text>
          </MessageBarBody>
        </MessageBar>
      )}
      <HandoffSelector agentId={selectedNodeId} readOnly={!!readOnly} />
      {handoffActions.map((action) => (
        <HandoffToolEntry key={action.id} agentId={selectedNodeId} toolId={action.toolId} />
      ))}
    </div>
  );
};

export const handoffTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.HANDOFF,
  title: intl.formatMessage({
    defaultMessage: 'Handoffs',
    id: 'kkFPeq',
    description: 'Handoff tab title',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure handoffs for your agent',
    id: 'NTgFLv',
    description: 'Handoff tab description',
  }),
  visible: true,
  content: <HandoffTab {...props} />,
  order: 0,
  icon: 'Info',
});
