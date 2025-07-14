import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import { Text, MessageBar, MessageBarBody } from '@fluentui/react-components';
import { useMemo } from 'react';
import { useIntl } from 'react-intl';

import constants from '../../../../../common/constants';
import { useHandoffToolsForAgent } from '../../../../../core/state/workflow/workflowSelectors';
import { HandoffToolEntry } from './HandoffToolEntry';
import { useHandoffTabStyles } from './handoffTab.styles';

export const HandoffTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const intl = useIntl();

  const intlText = useMemo(
    () => ({
      handoffDescription: intl.formatMessage({
        defaultMessage: 'Handoffs define which agents can receive control of the workflow.',
        id: '2cnu8S',
        description: 'Description of handoffs',
      }),
    }),
    [intl]
  );

  const handoffTools = useHandoffToolsForAgent(selectedNodeId);

  const styles = useHandoffTabStyles();

  return (
    <div className={styles.handoffEntryContainer}>
      <MessageBar>
        <MessageBarBody>
          <Text>{intlText.handoffDescription}</Text>
        </MessageBarBody>
      </MessageBar>
      {handoffTools.map((tool) => (
        <HandoffToolEntry key={tool} agentId={selectedNodeId} toolId={tool} />
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
