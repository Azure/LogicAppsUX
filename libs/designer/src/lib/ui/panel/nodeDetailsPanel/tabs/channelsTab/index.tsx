import type { PanelTabFn, PanelTabProps } from '@microsoft/designer-ui';
import constants from '../../../../../common/constants';
import { MessageBarBody, Switch, type SwitchOnChangeData } from '@fluentui/react-components';
import { useMemo, useState } from 'react';
import { useIntl } from 'react-intl';
import { useSelector } from 'react-redux';
import type { RootState } from '../../../../../core/store';
import { MessageBar } from '@fluentui/react';
import ChannelContent from './ChannelContent';

export const ChannelsTab: React.FC<PanelTabProps> = (props) => {
  const { nodeId: selectedNodeId } = props;
  const supportedChannels = useSelector((state: RootState) => state.operations.supportedChannels[selectedNodeId]);

  const [enabled, setEnabled] = useState(false);

  const intl = useIntl();

  const stringResources = useMemo(
    () => ({
      ENABLED: intl.formatMessage({
        defaultMessage: 'Enabled',
        id: 'rRM1pj',
        description: 'Channel enabled.',
      }),
      DISABLED: intl.formatMessage({
        defaultMessage: 'Disabled',
        id: 'OnjMM3',
        description: 'Channel disabled.',
      }),
      NO_CHANNEL_SUPPORTED_MSG: intl.formatMessage({
        defaultMessage: 'No channel supported for this agent.',
        id: 'di6MC0',
        description: 'channel not supported message',
      }),
    }),
    [intl]
  );

  return (
    <>
      {supportedChannels.length === 0 ? (
        <MessageBar key={'warning'} className="msla-initialize-variable-warning">
          <MessageBarBody>{stringResources.NO_CHANNEL_SUPPORTED_MSG}</MessageBarBody>
        </MessageBar>
      ) : (
        <>
          <Switch
            checked={enabled}
            onChange={(_, data: SwitchOnChangeData) => {
              setEnabled(data.checked);
            }}
            style={{ display: 'flex', justifyContent: 'center', marginTop: '10px' }}
            label={enabled ? stringResources.ENABLED : stringResources.DISABLED}
          />
          {enabled && (
            <ChannelContent
              selectedNodeId={selectedNodeId}
              // TODO: Add support for multiple channels
              channelToAdd={supportedChannels[0]}
            />
          )}
        </>
      )}
    </>
  );
};

export const channelsTab: PanelTabFn = (intl, props) => ({
  id: constants.PANEL_TAB_NAMES.CHANNELS,
  title: intl.formatMessage({
    defaultMessage: 'Channels',
    id: '5lEeZZ',
    description: 'Channels tab title',
  }),
  description: intl.formatMessage({
    defaultMessage: 'Configure channels for your agent',
    id: 'MbrpMM',
    description: 'Channels tab description',
  }),
  visible: true,
  content: <ChannelsTab {...props} />,
  order: 0,
  icon: 'Info',
});
